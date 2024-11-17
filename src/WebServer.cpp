#include "WebServer.hpp"

WebServer::WebServer(LedController &ledController)
    : _lc(ledController),
      _webServer(new AsyncWebServer(80)),
      _webSocket(new AsyncWebSocket("/socket"))
{
    _webServer->on("/", HTTP_GET, [](AsyncWebServerRequest *request)
                   {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.html.gz", "text/html");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });
    _webServer->on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request)
                   {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.js.gz", "text/javascript");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });
    _webServer->on("/settings", HTTP_GET, [](AsyncWebServerRequest *request)
                   {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/settings.html.gz", "text/html");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });
    _webServer->on("/settings.js", HTTP_GET, [](AsyncWebServerRequest *request)
                   {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/settings.js.gz", "text/javascript");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });

    _webSocket->onEvent([this](AsyncWebSocket *server, AsyncWebSocketClient *client, AwsEventType type, void *arg, uint8_t *data, size_t len)
                        { 
                            this->OnEvent(server, client, type, arg, data, len); 
                        });
    _webServer->addHandler(_webSocket);
    _webServer->begin();
}

void WebServer::OnEvent(AsyncWebSocket *server,
                        AsyncWebSocketClient *client,
                        AwsEventType type,
                        void *arg,
                        uint8_t *data,
                        size_t len)
{
    switch (type)
    {
    case WS_EVT_CONNECT:
    {
        constexpr size_t n = 3;
        size_t sizeU8 = (_lc.Width * _lc.Height) * sizeof(uint32_t) + n * sizeof(uint8_t);
        uint8_t bufferU8[sizeU8];
        size_t ledIndex = 0;
        bufferU8[0] = MessageType::SetFullState;
        bufferU8[1] = _lc.Height;
        bufferU8[2] = _lc.Width;
        for (size_t i = n; i < sizeU8; i += 4)
        {
            ledIndex = (i - n) / 4;
            bufferU8[i + 0] = 0;
            bufferU8[i + 1] = _lc.Pixels[ledIndex].r;
            bufferU8[i + 2] = _lc.Pixels[ledIndex].g;
            bufferU8[i + 3] = _lc.Pixels[ledIndex].b;
        }
        _webSocket->binary(client->id(), bufferU8, sizeU8);
        break;
    }
    case WS_EVT_DISCONNECT:
    {
        Serial.printf("WebSocket client #%u disconnected\n", client->id());
        break;
    }
    case WS_EVT_DATA:
    {
        WebServer::HandleWebSocketMessage(arg, data, len, client);
        break;
    }
    case WS_EVT_PONG:
        break;
    case WS_EVT_ERROR:
    {
        Serial.print("ERROR: Smth woron..\n");
        break;
    }
    }
}

void WebServer::HandleWebSocketMessage(void *msgInfo, uint8_t *data, size_t N, AsyncWebSocketClient *sender)
{
    const AwsFrameInfo *frameInfo = (AwsFrameInfo *)(msgInfo);
    if (frameInfo->final &&
        frameInfo->index == 0 &&
        frameInfo->len == N &&
        frameInfo->opcode == WS_BINARY) // ПРИНИМАЕМ ТОЛЬКО BIN
    {

        const uint8_t msgType = data[0];

        switch (msgType)
        {
        case MessageType::SetPointsSolidColor:
        {
            //    0     1  2  .  .  .  .   N-4   N-3   N-2   N-1
            //[msgType][x][y][x][y][x][y][alpha][red][green][blue]
            constexpr size_t HEAD_SIZE = 1;
            constexpr size_t COLOR_SIZE = 4;
            size_t pointsCount = (N - HEAD_SIZE - COLOR_SIZE) / 2;
            uint32_t color = (data[N - 4] << 24) | // alpha
                             (data[N - 3] << 16) | // red
                             (data[N - 2] << 8) |  // green
                             (data[N - 1] << 0);   // blue
            for (size_t i = 0; i < pointsCount; i++)
            {
                uint8_t x = data[HEAD_SIZE + i * 2];
                uint8_t y = data[HEAD_SIZE + i * 2 + 1];
                _lc.SetPixel(x, y, color);
            }
            _lc.Show();
            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client != sender)
                    _webSocket->binary(client->id(), data, N);
            }
            break;
        }
        case MessageType::SetSolidColor:
        {
            //           N-4   N-3   N-2   N-1
            //[msgType][alpha][red][green][blue]
            //    0       1     2     3     4
            uint32_t color = (data[N - 4] << 24) | (data[N - 3] << 16) | (data[N - 2] << 8) | (data[N - 1] << 0);
            _lc.FillSolidColor(color);
            FastLED.show();
            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client != sender)
                    _webSocket->binary(client->id(), data, N);
            }
            break;
        }
        case MessageType::SetOnePixel:
        {
            //                 N-4   N-3   N-2   N-1
            //[msgType][x][y][alpha][red][green][blue]
            //    0     1  2     3    4     5      6
            uint8_t x = data[N - 6];
            uint8_t y = data[N - 5];
            uint32_t color = (data[N - 4] << 24) | (data[N - 3] << 16) | (data[N - 2] << 8) | (data[N - 1] << 0);
            _lc.SetPixel(x, y, color, true);
            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client != sender)
                    _webSocket->binary(client->id(), data, N);
            }
            break;
        }
        case MessageType::Settings:
        {
            //[msgType][height][width]
            uint8_t height = data[N - 2];
            uint8_t width = data[N - 1];
            FSWrapper::WriteConfigUnsafe(width, height);
            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client != sender)
                    _webSocket->binary(client->id(), data, N);
            }
            break;
        }

        default:
            Helper::FallWithError("Got error message");
            break;
        }
    }
}
