const { command, mode, getJson } = require("../lib");
const moment = require("moment");
const ScrapeSrc = require("../lib/scraper");
const getFloor = function (number) {
  return Math.floor(number);
};
command(
  {
    pattern: "lyrics",
    fromMe: mode,
    desc: "Search and Get Song Lyrics",
    type: "search",
  },
  async (m, match) => {
    if (!match) return await m.sendReply("_Hmm Provide Me A Song Name_");
    await m.reply("_Searching Lyrics!_");
    const lyricsMsg = await ScrapeSrc.lyrics(match);
    return await m.send(lyricsMsg, {
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363327841612745@newsletter",
          newsletterName: "sᴏɴɢ ʟʏʀɪᴄs",
        },
      },
    });
  },
);

command(
  {
    pattern: "weather ?(.*)",
    fromMe: mode,
    desc: "weather info",
    type: "search",
  },
  async (message, match) => {
    if (!match) return await message.send("*Example : weather delhi*");
    const data = await getJson(
      `http://api.openweathermap.org/data/2.5/weather?q=${match}&units=metric&appid=060a6bcfa19809c2cd4d97a212b19273&language=en`,
    ).catch(() => {});
    if (!data) return await message.send(`_${match} not found_`);
    const { name, timezone, sys, main, weather, visibility, wind } = data;
    const degree = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ][getFloor(wind.deg / 22.5 + 0.5) % 16];
    return await message.send(
      `*Name :* ${name}\n*Country :* ${sys.country}\n*Weather :* ${weather[0].description}\n*Temp :* ${getFloor(main.temp)}°\n*Feels Like :* ${getFloor(main.feels_like)}°\n*Humidity :* ${main.humidity}%\n*Visibility  :* ${visibility}m\n*Wind* : ${wind.speed}m/s ${degree}\n*Sunrise :* ${moment.utc(sys.sunrise, "X").add(timezone, "seconds").format("hh:mm a")}\n*Sunset :* ${moment.utc(sys.sunset, "X").add(timezone, "seconds").format("hh:mm a")}`,
    );
  },
);

command(
  {
    pattern: "google",
    fromMe: mode,
    desc: "Search Google",
    type: "search",
  },
  async (message, match) => {
    if (!match) return await message.send("_need query!_");
    await message.send("_Searching google_");
    const results = await ScrapeSrc.google(match);
    return message.send(results, {
      contextInfo: {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363327841612745@newsletter",
          newsletterName: "ɢᴏᴏɢʟᴇ sᴇᴀʀᴄʜ",
        },
      },
    });
  },
);

command(
  {
    pattern: "tgs",
    fromMe: mode,
    desc: "Download Telegram Stickers",
    type: "search",
  },
  async (message, match, m) => {
    if (!match) return await message.send("_Provide telegram Sticker link!_");
    await message.send("_Fetching Stickers_");
  },
);
