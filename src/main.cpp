#include <Arduino.h>
#include "messageType.hpp"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "FastLED.h"
#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

int width{0};
int height{0};
const int LED_PIN = 16;
CRGB *leds = nullptr;

const char SSID[] = "СКОТОБАЗА";
const char password[] = "01012000iI";
const IPAddress IP(192, 168, 1, 254);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);

AsyncWebServer server(80);
AsyncWebSocket ws("/socket");

void writeConfig(int width, int height);
void setPixel(uint8_t x, uint8_t y, uint32_t color);
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
    constexpr size_t n = 3; 
    size_t sizeU8 = (width * height) * sizeof(uint32_t) + n*sizeof(uint8_t);
    uint8_t bufferU8[sizeU8];
    size_t ledIndex = 0;
    bufferU8[0] = MessageType::SetFullState;
    bufferU8[1] = height;
    bufferU8[2] = width;
    for (size_t i = n; i < sizeU8; i += 4)
    {
      ledIndex = (i - n) / 4;
      bufferU8[i + 0] = 0;
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
void setPixel(uint8_t x, uint8_t y, uint32_t color)
{
  leds[y * width + x] = color;
}
void handleWebSocketMessage(void *msgInfo, uint8_t *data, size_t N, AsyncWebSocketClient *sender)
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
        setPixel(x, y, color);
      }
      Serial.printf("SetPoints: Color is %08X\n", color);
      FastLED.show();

      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, N);
      }
      break;
    }
    case MessageType::SetSolidColor:
    {
      //           N-4   N-3   N-2   N-1
      //[msgType][alpha][red][green][blue]
      //    0       1     2     3     4
      uint32_t color = (data[N - 4] << 24) | (data[N - 3] << 16) | (data[N - 2] << 8) | (data[N - 1] << 0);
      fillSolidColor(color);
      FastLED.show();
      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, N);
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
      setPixel(x, y, color);
      FastLED.show();
      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, N);
      }
      break;
    }
    case MessageType::Settings:
    {
      //[msgType][height][width]
      uint8_t height = data[N - 2];
      uint8_t width = data[N - 1];
      writeConfig(width,height);
      AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
      for (auto client : clients)
      {
        if (client != sender)
          ws.binary(client->id(), data, N);
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
void readConfig(int* width , int* height)
{
  const char* fileName = "/config.txt";
  File file = LittleFS.open(fileName , "r");
  if (!file)
  {
    SignalErrorLed("Could't read %s" , fileName);
    return;
  }

  String widthStr = file.readStringUntil('\n');
  *width = widthStr.toInt();

  String heightStr = file.readStringUntil('\n');
  *height = heightStr.toInt();

  file.close();
}
void writeConfig(int width, int height)
{
  const char* fileName = "/config.txt";
  File file = LittleFS.open(fileName, "w");
  if (!file)
  {
    SignalErrorLed("Could't open %s for writing", fileName);
    return;
  }
  file.println(width);
  file.println(height);

  file.close();
}
void setup()
{
  Serial.begin(115200);
  if (!LittleFS.begin())
    SignalErrorLed("LittleFS failed to configure");

  readConfig(&width , &height);

  Serial.printf("width: %d ; height:%d" , width ,height);
  leds = new CRGB[width * height];

  FastLED.addLeds<WS2812B, LED_PIN, GRB>(leds, width * height);
  FastLED.setBrightness(100);
  fillSolidColor((uint32_t)0xff0000);
  FastLED.show();

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
  server.on("/settings", HTTP_GET, [](AsyncWebServerRequest *request)
            {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/settings.html.gz", "text/html");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });
  server.on("/settings.js", HTTP_GET, [](AsyncWebServerRequest *request)
            {
                  AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/settings.js.gz", "text/javascript");
                  response->addHeader("Content-Encoding", "gzip");
                  request->send(response); });

  ws.onEvent(onEvent);
  server.addHandler(&ws);
  server.begin();
  pinMode(32, INPUT);
}

void loop()
{
}
