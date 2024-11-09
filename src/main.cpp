#include <Arduino.h>

#include <WiFi.h>
#include <ESPAsyncWebServer.h>

#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>

const uint16_t width = 12;
const uint16_t height = 50;
uint8_t pixels[width * height]{0};

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

void handleWebSocketMessage(void *msgInfo, uint8_t *data, size_t len,AsyncWebSocketClient *sender);

void setup()
{
  Serial.begin(115200);

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
    ws.text(client->id(),pixels,height*width);
    Serial.printf("WebSocket client #%u connected from %s\n", client->id(), client->remoteIP().toString().c_str());
    break;
  case WS_EVT_DISCONNECT:
    Serial.printf("WebSocket client #%u disconnected\n", client->id());
    break;
  case WS_EVT_DATA:
    handleWebSocketMessage(arg, data, len , client);
    break;
  case WS_EVT_PONG:
  case WS_EVT_ERROR:
    break;
  }
}

void handleWebSocketMessage(void *msgInfo, uint8_t *data, size_t len,AsyncWebSocketClient *sender)
{
  const AwsFrameInfo *frameInfo = (AwsFrameInfo *)(msgInfo);
  if (frameInfo->final &&
      frameInfo->index == 0 &&
      frameInfo->len == len &&
      frameInfo->opcode == WS_TEXT)
  {
    data[len] = 0;
    uint8_t x, y, state;
    int n = sscanf((char *)data, "%d:%d %s", &x, &y, &state);
    if (n != 3)
      Serial.printf("Error while parsing\n %s\n", (char *)data);
    pixels[y * width + x] = state;

    AsyncWebSocket::AsyncWebSocketClientLinkedList clients = ws.getClients();
    char buffer[32];
    sprintf(buffer, "%d:%d %d", x, y, state);

    for(auto client : clients)
    {
      if(client != sender)
        ws.text(client->id(), buffer);  
    }

    Serial.println(buffer);
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
void loop()
{
}
