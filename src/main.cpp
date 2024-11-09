#include <Arduino.h>
#include <ESP8266WiFi.h>
#include <ESPAsyncWebServer.h>
#include "LittleFS.h"

const uint16_t width = 12;
const uint16_t height = 50;

const char SSID[] = "";
const char password[] = "";
const IPAddress IP(192, 168, 1, 254);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);

AsyncWebServer server(80);

void setup()
{
  {
    if(!LittleFS.begin()){
      Serial.println("LittleFS failed to configure");
      return;
    }
  }

  Serial.begin(115200);
  {
    if (!WiFi.config(IP, GATEWAY, SUBNET))
    {
      Serial.println("STA Failed to configure");
      return;
    }
    WiFi.mode(WIFI_STA);
    WiFi.begin(SSID, password);
    if (WiFi.waitForConnectResult() != WL_CONNECTED)
    {
      Serial.printf("WiFi Failed!\n");
      return;
    }
  }
  
  {
    server.on("/", HTTP_GET, [](AsyncWebServerRequest *request)
              {
                AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.html.gz", "text/html");
                response->addHeader("Content-Encoding", "gzip");
                request->send(response);
              });
    server.on("/index.js", HTTP_GET, [](AsyncWebServerRequest *request)
              {
                AsyncWebServerResponse *response = request->beginResponse(LittleFS, "/index.js.gz", "text/javascript");
                response->addHeader("Content-Encoding", "gzip");
                request->send(response);
              });

    server.begin();
  }
}

void loop()
{
}
