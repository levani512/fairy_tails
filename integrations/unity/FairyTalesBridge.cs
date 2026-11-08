using System;
using UnityEngine;
// Wire these methods to your chosen WebView plugin. No vendor dependency is assumed.
public class FairyTalesBridge : MonoBehaviour {
 [Serializable] public class Message { public int version = 1; public string type; public string storyId; public string language; public string code; }
 public event Action<string> SendJsonToWebView;
 public event Action ReturnToGame;
 public void OpenStory(string id, string language = "en") {
  SendJsonToWebView?.Invoke(JsonUtility.ToJson(new Message {type="OPEN_STORY",storyId=id,language=language}));
 }
 public void OnWebMessage(string json) {
  var message=JsonUtility.FromJson<Message>(json);
  if(message==null||message.version!=1)return;
  switch(message.type) {
   case "RETURN_TO_UNITY": ReturnToGame?.Invoke(); break;
   case "SESSION_EXPIRED": Debug.Log("Re-establish the short-lived server session."); break;
   case "ERROR": Debug.LogWarning("Fairy Tales: "+message.code); break;
  }
 }
 // Establish a session with your backend via HTTPS POST. Inject only a one-use
 // exchange code through the trusted native bridge; never put subscription proofs in a URL.
}
