repeat task.wait() until game:IsLoaded()
local HttpService = game:GetService("HttpService")
local ScriptContext = game:GetService("ScriptContext")
local websocket = WebSocket or websocket
local Encode = function(...) return HttpService:JSONEncode(...) end
local IP = ...
local URL = IP ~= nil and IP ~= "" and IP or "localhost"
while task.wait(1) do
	local s, r = pcall(function()
		-- Will need change the localhost to your own ip address if you are using this on emulator or other device
		warn("Starting connection to " .. URL .. ":33882")
		local connection = websocket.connect(string.format("ws://%s:33882/", URL))
		warn("Connected to " .. URL .. ":33882")
		connection:Send(Encode({ type = "auth", name = game.Players.LocalPlayer.Name }))
		warn("Sent auth request to " .. URL .. ":33882")

		local function tostringAll(...)
			local args = { ... }
			for i, v in ipairs(args) do args[i] = tostring(v) end
			return args
		end

		local function sendOutput(output_type, ...)
			local t = tostringAll(...)
			if connection and checkcaller() then connection:Send(Encode({ type = "output", output_type = output_type, output = table.concat(t, " ") })) end
		end

		connection.OnMessage:Connect(function(msg)
			local func, err = loadstring(msg)
			if typeof(func) ~= "function" then
				warn(func, err)
				connection:Send(Encode({ type = "compile_error", error = "Syntax error: " .. (err or "Unknown error") }))
				return
			elseif err then
				connection:Send(Encode({ type = "compile_error", error = (err or "Unknown error") }))
				return
			end
			func()
		end)

		local oldPrint
		oldPrint = hookfunction(print, function(...)
			sendOutput("PRINT", ...)
			return oldPrint(...)
		end)

		local oldWarn
		oldWarn = hookfunction(warn, function(...)
			sendOutput("WARN", ...)
			return oldWarn(...)
		end)

		ScriptContext.ErrorDetailed:Connect(function(message, stackTrace, script, details, securityLevel)
			local text = ("%s%s%s\n%s"):format(message:sub(1, 1), utf8.char(8203), message:sub(2), stackTrace)
			if connection and (script == nil or not script:IsDescendantOf(game)) then sendOutput("ERROR", text) end
		end)

		warn("Authenticated...")
		connection.OnClose:Wait()
		connection = nil
		warn("Disconnected from " .. URL .. ":33882")
	end)

	if not s then warn("Error: " .. r) end
end
