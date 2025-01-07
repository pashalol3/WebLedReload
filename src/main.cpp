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
FSWrapper *fsWrapper = nullptr;

void setup()
{
  Serial.begin(115200);

  Helper::Assert(LittleFS.begin(), "LittleFS initialization failed");
  fsWrapper = new FSWrapper();

  fsWrapper->ReadConfigUnsafe();

  Helper::Log("w=%d h=%d rps=%d" , fsWrapper->Width,fsWrapper->Height,fsWrapper->RefPointsSize);

  ledController = new LedController(
    fsWrapper->Width,
    fsWrapper->Height
  );
  // for(size_t i = 0 ; i < 2; i++){
  //   Helper::Log("x=%d y=%d",fsWrapper->RefPoints[i].X,fsWrapper->RefPoints[i].Y);
  // }
  // return;
  ledController->FillTranslateMatrix(
    fsWrapper->RefPoints,
    fsWrapper->RefPointsSize
  );
  ledController->FillSolidColor(0xff0000);

  Helper::Assert(WiFi.config(IP, GATEWAY, SUBNET), "WiFi initialization failed");

  WiFi.mode(WIFI_STA);
  WiFi.begin(SSID, password);

  Helper::Assert(
    WiFi.waitForConnectResult() == WL_CONNECTED, 
    "Could't conect to %s with password %s", SSID, password
  );

  webServer = new WebServer(*ledController,*fsWrapper);
  pinMode(32, INPUT);
}

void loop()
{
}
