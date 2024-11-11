#include <Arduino.h>
#include "messageType.hpp"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "FastLED.h"
#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

const int width = 2;
const int height = 50;
const int ledPin = 16;

CRGB leds[width * height];

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
  for (size_t i = 0; i < width * height; i++)
  {
    leds[i] = color;
  }
}
void setup()
{

  Serial.begin(115200);

  FastLED.addLeds<WS2811, ledPin, GRB>(leds, width * height);
  FastLED.setBrightness(100);
  fillSolidColor((uint32_t)0xff0000);
  FastLED.show();

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
  case WS_EVT_CONNECT:
  {
    //                 |      600                  4      |          1      | (2401)
    // size_t sizeU8 = (width * height) * sizeof(pixels[0]) + sizeof(uint8_t);
    // uint8_t buffer[sizeU8];
    // memcpy(&buffer[1], pixels, sizeU8 - 1);
    // uint8_t *bufferU8 = (uint8_t *)buffer;
    // bufferU8[0] = MessageType::InitialState;
    // ws.binary(client->id(), bufferU8, sizeU8);

    size_t sizeU8 = (width * height) * sizeof(uint32_t) + sizeof(uint8_t);
    uint8_t bufferU8[sizeU8];
    size_t ledIndex = 0;
    bufferU8[0] = MessageType::InitialState;

    for (size_t i = 1; i < sizeU8 - 3; i += 4)
    {
      ledIndex = (i - 1) / 4;
      bufferU8[  i  ] = 0;
      bufferU8[i + 1] = leds[ledIndex].r;
      bufferU8[i + 2] = leds[ledIndex].g;
      bufferU8[i + 3] = leds[ledIndex].b;
    }
    ws.binary(client->id(), bufferU8, sizeU8);
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

    const uint8_t msgType = data[0];

    switch (msgType)
    {
    case MessageType::SetPoints:
    {
      //    0     1  2  .  .  .  .   N-4   N-3   N-2   N-1
      //[msgType][x][y][x][y][x][y][alpha][red][green][blue]
      constexpr size_t HEAD_SIZE = 1;
      constexpr size_t COLOR_SIZE = 4;
      size_t pointsCount = (len - HEAD_SIZE - COLOR_SIZE) / 2;
      uint32_t color = (data[len - 4] << 24) | //alpha
                       (data[len - 3] << 16) | //red
                       (data[len - 2] << 8)  | //green
                       (data[len - 1] << 0);   //blue
      for (size_t i = 0; i < pointsCount; i++)
      {
        uint8_t x = data[HEAD_SIZE + i * 2];
        uint8_t y = data[HEAD_SIZE + i * 2 + 1];
        leds[y * width + x] = color;
      }
      FastLED.show();

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
      //           N-4   N-3   N-2   N-1
      //[msgType][alpha][red][green][blue]
      //    0       1      2      3      5
      uint32_t color = (data[1] << 24) | (data[2] << 16) | (data[3] << 8) | (data[4] << 0);
      fillSolidColor(color);
      FastLED.show();
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
void loop()
{
}
