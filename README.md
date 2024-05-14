# StarHub Ws Server

StarHub Ws Server is a extension for Visual Studio Code that allows you to run a Code LUA in your roblox using WebSocket.

## Features

- Run Code LUA in your roblox using WebSocket.
- Notifies when a client connects or disconnects.
- Redirects the output of the code to the output of the extension.

## Script

You need to put this script in your roblox to connect with the extension.

```lua
local IP = "" -- Put the IP address here. You leave it empty if you are going to use in same computer. (If you will use in other Device, you need to put the IP address of the computer that is running the extension)

loadstring(game:HttpGet("https://raw.githubusercontent.com/TrapstarKSSKSKSKKS/StarHub-Extension/main/src/wsConnection.lua"))()
```

## Credits

- This extension its made by trapstar#0000 and its a contribution to the roblox community.
- Any questions or suggestions, contact me on discord: trapstar#0000