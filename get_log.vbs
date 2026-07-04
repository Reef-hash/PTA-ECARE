Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.Run "cmd.exe", 1, False
WScript.Sleep 1500
WshShell.AppActivate "cmd.exe"
WshShell.SendKeys "ssh -p 65002 u134652667@145.79.9.27 ""cat domains/api.ptas.my/nodejs/stderr.log | tail -n 20 > domains/api.ptas.my/public_html/error.txt""{ENTER}"
WScript.Sleep 3000
WshShell.SendKeys "k5;FY3WxT{ENTER}"
WScript.Sleep 5000
WshShell.SendKeys "exit{ENTER}"
