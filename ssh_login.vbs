Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.Run "ssh -p 65002 u134652667@145.79.9.27 ""cd domains/api.ptas.my/nodejs && git pull && echo 1 > tmp/restart.txt"""
WScript.Sleep 4000
WshShell.SendKeys "k5;FY3WxT{ENTER}"
WScript.Sleep 5000
