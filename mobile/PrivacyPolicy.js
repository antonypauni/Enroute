import {Modal,Pressable,ScrollView,Text,View} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import policy from './privacyPolicy.json';

export default function PrivacyPolicy({visible,onClose}) {
  return <Modal visible={visible} animationType="slide" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:'#f5f7f5'}}>
    <Pressable accessibilityRole="button" onPress={onClose} style={{padding:20}}><Text style={{color:'#174e39',fontSize:18,fontWeight:'700'}}>Fermer la politique</Text></Pressable>
    <ScrollView contentContainerStyle={{padding:24,gap:20}}><Text accessibilityRole="header" style={{fontSize:30,fontWeight:'700',color:'#173e36'}}>{policy.title}</Text>
      <Text>Mise à jour : {policy.updated}</Text><Text style={{padding:16,backgroundColor:'#fff7d5',fontSize:16}}>Version provisoire : identité de l’exploitant, contact et conservation à compléter avant publication dans les boutiques.</Text>
      {policy.sections.map(section=><View key={section.title} style={{gap:10}}><Text accessibilityRole="header" style={{fontSize:21,fontWeight:'700',color:'#173e36'}}>{section.title}</Text>{section.paragraphs.map(text=><Text key={text} style={{fontSize:16,lineHeight:25,color:'#30483e'}}>{text}</Text>)}</View>)}
    </ScrollView>
  </SafeAreaView></Modal>;
}
