#include <Arduino.h>
#include "messageType.hpp"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>

#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

const int width = 12;
const int height = 50;
uint32_t pixels[width * height];

const char SSID[] = "СКОТОБАЗА";
const char password[] = "01012000iI";
const IPAddress IP(192, 168, 1, 254);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);

AsyncWebServer server(80);
AsyncWebSocket ws("/socket");
void AssertSignalErrorLed(bool predicate, const char *message, ...);
void SignalErrorLed(const char *message, ...);
void onEvent(AsyncWebSocket *server,
             AsyncWebSocketClient *client,
             AwsEventType type,
             void *arg,
             uint8_t *data,
             size_t len);

void handleWebSocketMessage(void *msgInfo, uint8_t *data, size_t len, AsyncWebSocketClient *sender);
void fillSolidColor(uint32_t color)
{
  memset(pixels, color, width * height);
}
void setup()
{

  Serial.begin(115200);

  fillSolidColor((uint32_t)0x000000);

  if (!LittleFS.begin())
    SignalErrorLed("LittleFS failed to configure");

  if (!WiFi.config(IP, GATEWAY, SUBNET))
    SignalErrorLed("WiFi init fail...");

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, password);

  if (WiFi.waitForConnectResult() != WL_CONNECTED)
  {
    char buffer[64];
    sprintf(buffer, "Could't conect to %s with password %s", SSID, password);
    SignalErrorLed(buffer);
  }

  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
            {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.html.gz", "text/html");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });
  server.on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request)
            {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.js.gz", "text/javascript");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();
}

void onEvent(AsyncWebSocket *server,
             AsyncWebSocketClient *client,
             AwsEventType type,
             void *arg,
             uint8_t *data,
             size_t len)
{
  switch (type)
  {
    // TODO little / big indian??
  case WS_EVT_CONNECT:
  {
    size_t sizeUint8 = (width * height + 1) * sizeof(pixels[0]);
    size_t sizeUint32 = sizeUint8 / sizeof(pixels[0]);
    uint32_t *buffer = new uint32_t[sizeUint32];
    // buffer[0] = MessageType::InitialState;
    memset(buffer, 0x000000, sizeUint32);
    memcpy(&buffer[1], pixels, sizeUint32 - 1);

    uint8_t *bufferUint8_t = (uint8_t *)buffer;
    bufferUint8_t[0] = 1 << 6; // BUG
    ws.binary(client->id(), bufferUint8_t, sizeUint8);
    delete[] buffer;
    break;
  }
  case WS_EVT_DISCONNECT:
  {
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
    break;
  }
  case WS_EVT_DATA:
  {
    handleWebSocketMessage(arg, data, len, client);
    break;
  }
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void handleWebSocketMessage(void *msgInfo, uint8_t *data, size_t len, AsyncWebSocketClient *sender)
{
  const AwsFrameInfo *frameInfo = (AwsFrameInfo *)(msgInfo);
  if (frameInfo->final &&
      frameInfo->index == 0 &&
      frameInfo->len == len &&
      frameInfo->opcode == WS_BINARY) // ПРИНИМАЕМ ТОЛЬКО BIN
  {

    const uint32_t msgType = (data[0] << 24) |
                             (data[1] << 16) |
                             (data[2] << 8) |
                             (data[3] << 0);
    switch (msgType)
    {
    case MessageType::SetPoints:
    {
      // 0 1 2 3   4 5 6 7   8 9 10 11
      // h h h h | x y x y | r g b  a

      //    0        1        2        3     4  5  .  .  .  .  N-4   N-3   N-2    N-1
      //[msgType][msgType][msgType][msgType][x][y][x][y][x][y][red][green][blue][alpha]
      constexpr size_t HEAD_SIZE = 4;
      constexpr size_t COLOR_SIZE = 4;
      size_t pointsCount = (len - HEAD_SIZE - COLOR_SIZE) / 2;
      uint32_t color =  (data[len - 4] << 24) | 
                        (data[len - 3] << 16) | 
                        (data[len - 2] << 8) | 
                        (data[len - 1] << 0);

      for (size_t i = 0; i < pointsCount; ++i)
      {
        uint8_t x = data[HEAD_SIZE + i * 2];
        uint8_t y = data[HEAD_SIZE + i * 2 + 1];
        pixels[y * width + x] = color;
      }

      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, len);
      }
      break;
    }
    case MessageType::FillSolid:
    {
      //                                       r      g      b    alpha
      //[msgType][msgType][msgType][msgType][color][color][color][color]
      //    0        1        2         3      6      7      8      9
      uint32_t color = (data[6] << 24) | (data[7] << 16) | (data[8] << 8) | (data[9] << 0);
      fillSolidColor(color);
      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, len);
      }
      break;
    }
    default:
      SignalErrorLed("Got error message");
      break;
    }
  }
}

void AssertSignalErrorLed(bool predicate, const char *message, ...)
{
  if (!predicate)
  {
    va_list args;
    va_start(args, message);
    SignalErrorLed(message, args);
    va_end(args);
  }
}

void SignalErrorLed(const char *message, ...)
{
  const uint8_t ledPin = 2;
  pinMode(ledPin, OUTPUT);
  va_list args;
  va_start(args, message);
  char formattedMessage[256];
  vsnprintf(formattedMessage, sizeof(formattedMessage), message, args);
  Serial.println(formattedMessage);
  va_end(args);
  while (1)
  {
    delay(500);
    digitalWrite(ledPin, !digitalRead(ledPin));
  }
}
void loop() {}
