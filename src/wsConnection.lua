repeat task.wait() until game:IsLoaded()
local HttpService = game:GetService("HttpService")
local ScriptContext = game:GetService("ScriptContext")
local IP = ...
while task.wait(1) do
	pcall(function()
		-- Will need change the localhost to your own ip address if you are using this on emulator or other device
		local connection = websocket.connect(string.format("ws://%s:33882/", IP or "localhost"))
		connection:Send(HttpService:JSONEncode({ type = "auth", name = game.Players.LocalPlayer.Name }))

		connection.OnMessage:Connect(function(msg)
            local func, err = loadstring(msg)
            if not func then
                connection:Send(HttpService:JSONEncode({ type = "compile_error", error = "Syntax error: " .. (err or "Unknown error") }))
                return
			elseif err then
				connection:Send(HttpService:JSONEncode({ type = "compile_error", error = (err or "Unknown error")}))
				return
			end
			func()
		end)

        local oldPrint;
        oldPrint = hookfunction(print, function(...)
            if checkcaller() and connection then
                connection:Send(HttpService:JSONEncode({ type = "output", output_type = "PRINT", output = table.concat({...}, " ") }))
            end
            return oldPrint(...)
        end)

        local oldWarn;
        oldWarn = hookfunction(warn, function(...)
            if checkcaller() and connection then
                connection:Send(HttpService:JSONEncode({ type = "output", output_type = "WARN", output = table.concat({...}, " ") }))
            end
            return oldWarn(...)
        end)

        local oldError;
        oldError = hookfunction(error, function(...)
            if checkcaller() and connection then
                connection:Send(HttpService:JSONEncode({ type = "output", output_type = "ERROR", output = table.concat({...}, " ") }))
            end
            return oldError(...)
        end)

        ScriptContext.ErrorDetailed:Connect(function(message, stackTrace, script, details, securityLevel)
            if connection and (script == nil or not script:IsDescendantOf(game)) then
                connection:Send(HttpService:JSONEncode({ type = "output", output_type = "ERROR", output = message:sub(1, 1) .. utf8.char(8203) .. message:sub(2) }))
            end
        end)

		connection.OnClose:Wait()
        connection = nil
	end)
end
