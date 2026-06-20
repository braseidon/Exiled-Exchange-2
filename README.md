# ![Perfect Jewelers Orb](./renderer/public/images/jeweler.png) Exiled Exchange 2 — braseidon fork

[![GitHub release](https://img.shields.io/github/v/release/braseidon/Exiled-Exchange-2?style=plastic&label=latest%20version)](https://github.com/braseidon/Exiled-Exchange-2/releases/latest)
[![GitHub Downloads (total)](https://img.shields.io/github/downloads/braseidon/Exiled-Exchange-2/total?style=plastic)](https://github.com/braseidon/Exiled-Exchange-2/releases)
[![GitHub commits since latest release](https://img.shields.io/github/commits-since/braseidon/Exiled-Exchange-2/latest/master?style=plastic)](https://github.com/braseidon/Exiled-Exchange-2/commits/master/)

Path of Exile 2 overlay program for price checking items, among many other loved features.

A fork of [Exiled Exchange 2](https://github.com/Kvan7/Exiled-Exchange-2) (itself a fork of [Awakened PoE Trade](https://github.com/SnosMe/awakened-poe-trade)) with extra fixes and quality-of-life tweaks — see [**what's different in this fork**](./FORK-CHANGES.md).

Download the fork only from its release page: <https://github.com/braseidon/Exiled-Exchange-2/releases>. It installs as its own app and won't touch an existing Exiled Exchange 2 install.

## Moving settings to the fork

**Already running the official Exiled Exchange 2?** The fork imports your settings automatically on first launch — you can skip this section.

Coming straight from PoE1 / Awakened PoE Trade:

1. Download the latest release from [releases](https://github.com/braseidon/Exiled-Exchange-2/releases)
2. Run installer
3. Run Exiled Exchange 2
4. Launch PoE2 to generate correct files
5. Quit PoE2 and EE2 after seeing the banner popup that EE2 loaded
6. Copy `apt-data` from `%APPDATA%\awakened-poe-trade` to `%APPDATA%\exiled-exchange-2-braseidon-fork` to copy your previous settings
  - Resulting directory structure should look like this:
  - `%APPDATA%\exiled-exchange-2-braseidon-fork\apt-data\`
    - `config.json`
7. Edit `config.json` and change the value of "windowTitle": "Path of Exile" to instead be "Path of Exile 2", otherwise it will open only for poe1
8. Start Exiled Exchange 2 and PoE2

## FAQ

<https://kvan7.github.io/Exiled-Exchange-2/faq>

## Tool showcase

| Gem                                                | Rare                                                 | Unique                                                   | Currency                                                     |
| -------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------ |
| ![Gem Check](./docs/reference-images/GemCheck.png) | ![Rare Check](./docs/reference-images/RareCheck.png) | ![Unique Check](./docs/reference-images/UniqueCheck.png) | ![Currency Check](./docs/reference-images/CurrencyCheck.png) |

### Development

See [DEVELOPING.md](./DEVELOPING.md)

### Acknowledgments

- [awakened-poe-trade](https://github.com/SnosMe/awakened-poe-trade)
- [libuiohook](https://github.com/kwhat/libuiohook)
- [RePoE](https://github.com/brather1ng/RePoE)
- [poeprices.info](https://www.poeprices.info/)
- [poe.ninja](https://poe.ninja/)

![graph](https://i.imgur.com/MATqhv7.png)
