#include "WebServer.hpp"

WebServer::WebServer(LedController &ledController, FSWrapper &fsWrapper)
    : _lc(ledController),
      _fsWrapper(fsWrapper),
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
                        { this->OnEvent(server, client, type, arg, data, len); });
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
        Helper::Log("WebSocket client #%u disconnected", client->id());
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
        Helper::Log("ERROR: Smth wrong..", 0);
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
            //[msgType][x][y][x][y][x][y][alpha][red][green][blue]
            //    1     1  1  ...    ...    1     1     1      1
            size_t rByteOffset = N - 1;
            constexpr size_t HEAD_SIZE = 1;
            constexpr size_t COLOR_SIZE = 4;
            size_t pointsCount = (N - HEAD_SIZE - COLOR_SIZE) / 2;
            uint32_t color = (data[rByteOffset--] << 24) | (data[rByteOffset--] << 16) | (data[rByteOffset--] << 8) | (data[rByteOffset--] << 0);

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
            //[msgType][alpha][red][green][blue]
            //    0       1     1     1     1
            size_t byteOffset = 1;
            uint32_t color = (data[byteOffset++] << 24) | (data[byteOffset++] << 16) | (data[byteOffset++] << 8) | (data[byteOffset++] << 0);
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
            //[msgType][x][y][alpha][red][green][blue]
            //    0     1  1    1     1     1      1
            size_t byteOffset = 1; //msgType
            uint8_t x = data[byteOffset++];
            uint8_t y = data[byteOffset++];
            uint32_t color = (data[byteOffset++] << 24) | (data[byteOffset++] << 16) | (data[byteOffset++] << 8) | (data[byteOffset++] << 0);
            _lc.SetPixel(x, y, color, true);
            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client != sender)
                    _webSocket->binary(client->id(), data, N);
            }
            break;
        }
        case MessageType::WriteSettings:
        { 
            uint16_t byteOffset = 1;
            uint8_t height = data[byteOffset++];
            uint8_t width = data[byteOffset++];
            uint32_t refPointsSize = (data[byteOffset++] << 24) |
                                     (data[byteOffset++] << 16) |
                                     (data[byteOffset++] << 8) |
                                     (data[byteOffset++] << 0);
            Helper::Log("refPointsSize=%d", refPointsSize);
            Point *refPoints = new Point[refPointsSize]; // free?

            uint8_t *dirArray = &data[byteOffset]; // dont move offset becouse its moving inside for loop!!!!

            for (size_t i = 0; i < refPointsSize; i++)
            {
                constexpr uint16_t POINT_BYTE_SIZE = 4;
                uint16_t x = (data[byteOffset++] << 8) | data[byteOffset++];
                uint16_t y = (data[byteOffset++] << 8) | data[byteOffset++];
                refPoints[i].X = x;
                refPoints[i].Y = y;
            }

            FSWrapper::WriteConfigUnsafe(width, height, refPoints, refPointsSize);

            ESP.restart();

            break;
        }

        case MessageType::ReadSettings:
        {
            // [msgType][Height][Width][refPointsSize][xIndex][yIndex]
            //     1       1     1            4          2       2
            const uint8_t HEAD_SIZE = 3 + 4;
            size_t totalSize = HEAD_SIZE + _fsWrapper.RefPointsSize * 4;
            uint8_t bufferToSend[totalSize] =
                {
                    MessageType::ReadSettings,
                    _fsWrapper.Height,
                    _fsWrapper.Width,
                    (uint8_t)((_fsWrapper.RefPointsSize >> 24) & 0xFF),
                    (uint8_t)((_fsWrapper.RefPointsSize >> 16) & 0xFF),
                    (uint8_t)((_fsWrapper.RefPointsSize >> 8) & 0xFF),
                    (uint8_t)((_fsWrapper.RefPointsSize >> 0) & 0xFF),

                };

            for (size_t i = 0; i < _fsWrapper.RefPointsSize; i++)
            {
                // x
                bufferToSend[HEAD_SIZE + i * 4 + 0] = (_fsWrapper.RefPoints[i].X >> 8) & 0xFF;
                bufferToSend[HEAD_SIZE + i * 4 + 1] = (_fsWrapper.RefPoints[i].X >> 0) & 0xFF;
                // y
                bufferToSend[HEAD_SIZE + i * 4 + 2] = (_fsWrapper.RefPoints[i].Y >> 8) & 0xFF;
                bufferToSend[HEAD_SIZE + i * 4 + 3] = (_fsWrapper.RefPoints[i].Y >> 0) & 0xFF;
            }

            AsyncWebSocket::AsyncWebSocketClientLinkedList clients = _webSocket->getClients();
            for (auto client : clients)
            {
                if (client == sender)
                    _webSocket->binary(client->id(), bufferToSend, totalSize);
            }

            break;
        }

        default:
            Helper::FallWithError("Got error message");
            break;
        }
    }
}
