Option Explicit

Dim shell, fso, scriptDir, projectRoot, mainScript, nodePath, cmd
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
projectRoot = fso.GetParentFolderName(scriptDir)
mainScript = projectRoot & "\src\main.js"

If Not fso.FileExists(mainScript) Then
  WScript.Quit 2
End If

nodePath = shell.ExpandEnvironmentStrings("%NVM_SYMLINK%") & "\node.exe"
If Not fso.FileExists(nodePath) Then
  nodePath = shell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
End If

If fso.FileExists(nodePath) Then
  cmd = """" & nodePath & """ """ & mainScript & """"
Else
  cmd = "node """ & mainScript & """"
End If

' 0 = hidden window, False = no wait
shell.Run cmd, 0, False
