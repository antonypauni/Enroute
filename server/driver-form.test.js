import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {transformWithEsbuild} from 'vite';

test('formulaire chauffeur : dépôt direct, confirmation et aucune ouverture de connexion',async()=>{
  const source=await readFile(new URL('../src/DriverRegistration.jsx',import.meta.url),'utf8');
  const {code}=await transformWithEsbuild(source,'DriverRegistration.jsx',{loader:'jsx',format:'cjs'});
  for(const [user,application,path] of [[null,null,'register'],[{role:'guest'},null,'register'],[{role:'client',name:'Test'},null,'apply']]){
    const calls=[],state=[];
    const React={createElement:(type,props,...children)=>({type,props:props||{},children}),useState:initial=>[initial,value=>state.push(value)]};
    const result={user:{id:'test',role:'client',accountType:'driver'},application:{status:'pending'}};
    const fields=[['password','synthetic-test-only'],['confirm','synthetic-test-only'],...['identity','license','registration','insurance'].map(key=>[key,{name:'test.pdf',type:'application/pdf',size:12}])];
    const context={module:{exports:{}},exports:{},require:()=>React,FormData:class{constructor(){}[Symbol.iterator](){return fields[Symbol.iterator]()}get(key){return fields.find(([name])=>name===key)?.[1]}},FileReader:class{readAsDataURL(){this.result='data:application/pdf;base64,JVBERg==';this.onload()}},fetch:async(url,options)=>{calls.push([url,JSON.parse(options.body)]);return {ok:true,json:async()=>result}}};
    context.exports=context.module.exports;vm.runInNewContext(code,context);
    const tree=context.module.exports.default({user,application:null,onDone:value=>calls.push(['done',value]),onLogin:()=>calls.push(['login'])});
    function find(node){if(!node||typeof node!=='object')return null;if(node.type==='form')return node;return node.children?.flat(Infinity).map(find).find(Boolean)}
    let prevented=false,stopped=false,reset=false;
    await find(tree).props.onSubmit({preventDefault(){prevented=true},stopPropagation(){stopped=true},target:{reset(){reset=true}}});
    // Existing dossiers are covered by the API tests; this checks the actual browser form handoff.
    assert.equal(calls[0][0],'/api/drivers/'+path);
    assert.equal(calls[1][0],'done');assert.equal(calls[1][1].application.status,'pending');
    assert.equal(calls.some(([name])=>name==='login'),false);
    assert.ok(prevented&&stopped&&reset);assert.ok(state.some(value=>typeof value==='string'&&value.includes('administration')));
  }
});
