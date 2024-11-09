#include <Arduino.h>
#include "messageType.hpp"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>

#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

const uint16_t width = 12;
const uint16_t height = 50;
uint32_t pixels[width * height];

const char SSID[] = "СКОТОБАЗА";
const char password[] = "01012000iI";
const IPAddress IP(192, 168, 1, 254);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);

AsyncWebServer server(80);
AsyncWebSocket ws("/socket");

void SignalErrorLed(const char *message);
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
    pixels[i] = color;
  }
}
void setup()
{
  Serial.begin(115200);

  fillSolidColor(0);

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
    //TODO little / big indian??
    Serial.printf("WebSocket client #%u connected\n", client->id());

    size_t sizeUint8 = (width * height + 1) * sizeof(pixels[0]); // 2404
    size_t sizeUint32 = sizeUint8 / sizeof(pixels[0]);           // 601
    uint32_t *buffer = new uint32_t[sizeUint32];
    // buffer[0] = MessageType::InitialState;
    memcpy(&buffer[1], pixels, sizeUint32 - 1);
    uint8_t *bufferUint8_t = reinterpret_cast<uint8_t *>(buffer);
    bufferUint8_t[0] = 1 << 6; //BUG
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
    case MessageType::SetPoint:
    {
      //                                             r      g      b    alpha
      //[msgType][msgType][msgType][msgType][x][y][color][color][color][color]
      //    0        1        2         3    4  5    6      7      8
      uint8_t x = data[4];
      uint8_t y = data[5];
      uint32_t color = (data[6] << 24) | (data[7] << 16) | (data[8] << 8) | (data[9] << 0);
      pixels[y * width + x] = color;
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
void SignalErrorLed(const char *message)
{
  const uint8_t ledPin = 2;
  pinMode(ledPin, OUTPUT);
  Serial.println(message);
  while (1)
  {
    delay(500);
    digitalWrite(ledPin, !digitalRead(ledPin));
  }
}
void loop() {}
