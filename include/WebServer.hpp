#ifndef WEBSERVER
#define WEBSERVER
#include <ESPAsyncWebServer.h>
#include "MessageType.hpp"
#include "LedController.hpp"
#include "Helper.hpp"
#include "FSWrapper.hpp"

class WebServer
{
private:
    LedController &_lc;
    AsyncWebServer *_webServer;
    AsyncWebSocket *_webSocket;
    FSWrapper &_fsWrapper;

public:
    WebServer(LedController &ledController, FSWrapper &fsWrapper);
    void HandleWebSocketMessage(void *msgInfo, uint8_t *data, size_t N, AsyncWebSocketClient *sender);
    void OnEvent(AsyncWebSocket *server,
                            AsyncWebSocketClient *client,
                            AwsEventType type,
                            void *arg,
                            uint8_t *data,
                            size_t len);
};

#endif // WEBSERVER