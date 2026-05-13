[app]

# App identity
title = CloudSnacks
package.name = cloudsnacks
package.domain = com.cloudsnacks

# Source
source.dir = .
source.include_exts = py,png,jpg,jpeg,kv,atlas,json
source.include_patterns = assets/*,utils/*,screens/*

# Version
version = 1.1.0

# Requirements — python3 unpinned so hostpython3 version matches automatically
requirements = python3,kivy==2.3.1,kivymd==1.2.0,pillow,certifi,charset-normalizer,idna,requests,urllib3

# App icon and splash — uses your CloudSnacks logo
icon.filename = %(source.dir)s/assets/icon.png
presplash.filename = %(source.dir)s/assets/presplash.png
presplash.color = #1D9E75

# Orientation
orientation = portrait
fullscreen = 0

# Android config
android.permissions = INTERNET,ACCESS_NETWORK_STATE,ACCESS_FINE_LOCATION
android.api = 33
android.minapi = 21
android.ndk = 25b
android.ndk_api = 21
android.accept_sdk_license = True

android.archs = arm64-v8a

# Pin p4a to stable release tag — avoids hostpython3 version drift on master
p4a.branch = v2024.01.21

android.splash_color = #1D9E75

[buildozer]
log_level = 2
warn_on_root = 1
