#include <Arduino.h>
#include "messageType.hpp"
#include <WiFi.h>
#include <ESPAsyncWebServer.h>
#include "LedController.hpp"
#include "Helper.hpp"
#include "FSWrapper.hpp"
#include "WebServer.hpp"
#include "LittleFS.h"
#include <freertos/FreeRTOS.h>
#include <freertos/task.h>


const char SSID[] = "СКОТОБАЗА";
const char password[] = "01012000iI";

const IPAddress IP(192, 168, 1, 254);
const IPAddress GATEWAY(192, 168, 1, 1);
const IPAddress SUBNET(255, 255, 255, 0);

LedController *ledController = nullptr;
WebServer *webServer = nullptr;



void setup()
{
  Serial.begin(115200);
  if (!LittleFS.begin())
    Helper::FallWithError("LittleFS initialization failed");

  int width, height;
  FSWrapper::ReadConfigUnsafe(&width, &height);

  ledController = new LedController(width,height);
  ledController->FillSolidColor(0xff0000);

  if (!WiFi.config(IP, GATEWAY, SUBNET))
    Helper::FallWithError("WiFi initialization failed");

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, password);

  if (WiFi.waitForConnectResult() != WL_CONNECTED)
  {
    char buffer[64];
    sprintf(buffer, "Could't conect to %s with password %s", SSID, password);
    Helper::FallWithError(buffer);
  }

  webServer = new WebServer(*ledController);
  pinMode(32, INPUT);
}

void loop()
{
}
