param([string]$OutputDirectory = 'demo-assets')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
Add-Type -ReferencedAssemblies @([System.Speech.Synthesis.SpeechSynthesizer].Assembly.Location, 'System.Collections') -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Speech.Synthesis;
public class WordMark { public int index; public string text; public int offset; public double startMs; public double endMs; }
public static class DemoVoice {
 public static WordMark[] Render(string text, string file) {
  var marks = new List<WordMark>();
  using (var voice = new SpeechSynthesizer()) {
   voice.Rate = -2;
   voice.SpeakProgress += (s,e) => { marks.Add(new WordMark { index=marks.Count, text=text.Substring(e.CharacterPosition,e.CharacterCount), offset=e.CharacterPosition, startMs=e.AudioPosition.TotalMilliseconds }); };
   voice.SetOutputToWaveFile(file); voice.Speak(text); voice.SetOutputToNull();
  }
  for(int i=0;i<marks.Count;i++) marks[i].endMs=i+1<marks.Count?Math.Max(marks[i].startMs+1,marks[i+1].startMs):marks[i].startMs+500;
  return marks.ToArray();
 }
}
'@
$null = New-Item -ItemType Directory -Force -Path $OutputDirectory
$pages = @(
 'Under a sleepy moon, a little fox found a golden seed.',
 'She carried it through the forest, where the trees whispered hello.',
 'Beside the river, a kind rabbit helped her plant the seed.',
 'They gave it water, warm wishes, and a little time to grow.',
 'At dawn, a tiny tree sparkled. There was enough wonder for everyone.'
)
for ($i=0; $i -lt $pages.Count; $i++) {
 $file = [System.IO.Path]::GetFullPath((Join-Path $OutputDirectory "voice-$i.wav"))
 $marks = [DemoVoice]::Render($pages[$i], $file)
 @{text=$pages[$i];timings=@($marks)} | ConvertTo-Json -Depth 5 | Set-Content -Encoding utf8 (Join-Path $OutputDirectory "voice-$i.json")
}
Write-Output 'Generated five original English narration clips with speech-engine word positions.'
