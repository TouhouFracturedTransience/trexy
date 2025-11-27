require('dotenv').config();
const express = require('express');
const { Client, GatewayIntentBits, Partials, Collection, Routes, EmbedBuilder } = require('discord.js');
const { REST } = require('@discordjs/rest');

// Basit config
const PREFIX = '.';
const PORT = process.env.PORT || 3000;

// /start komutunu kullanmış kullanıcıları ve dillerini hafızada tutacağız
// Map: userId -> { language: 'tr' | 'en' | ... }
const activeUsers = new Map();

// Çoklu dil metinleri
const TRANSLATIONS = {
  tr: {
    start_reply: 'Artık `.` prefixli komutları kullanabilirsin. Örnek: `.id` veya `.id 123456789012345678`',
    must_start: 'You must use `/start` first.',
    invalid_id: 'Geçerli bir Discord ID yazmalısın.',
    not_found: 'Bu ID ile kullanıcı bulunamadı veya çekilirken hata oluştu.',
    title: 'Kullanıcı Bilgisi',
    id: 'ID',
    username: 'Kullanıcı Adı',
    global_name: 'Global Name',
    created_at: 'Oluşturulma Tarihi',
    badges: 'Badgeler',
    avatar: 'Avatar',
    banner: 'Banner',
    no_badges: 'Yok',
    no_banner: 'Yok'
  },
  en: {
    start_reply: 'You can now use `.` prefix commands. Example: `.id` or `.id 123456789012345678`',
    must_start: 'You must use `/start` first.',
    invalid_id: 'You must provide a valid Discord ID.',
    not_found: 'No user found with this ID or an error occurred.',
    title: 'User Info',
    id: 'ID',
    username: 'Username',
    global_name: 'Global Name',
    created_at: 'Created At',
    badges: 'Badges',
    avatar: 'Avatar',
    banner: 'Banner',
    no_badges: 'None',
    no_banner: 'None'
  },
  de: {
    start_reply: 'Du kannst jetzt Befehle mit dem Präfix `.` verwenden. Beispiel: `.id` oder `.id 123456789012345678`',
    must_start: 'Du musst zuerst `/start` verwenden.',
    invalid_id: 'Du musst eine gültige Discord-ID angeben.',
    not_found: 'Kein Benutzer mit dieser ID gefunden oder ein Fehler ist aufgetreten.',
    title: 'Benutzerinfo',
    id: 'ID',
    username: 'Benutzername',
    global_name: 'Globaler Name',
    created_at: 'Erstellt am',
    badges: 'Abzeichen',
    avatar: 'Avatar',
    banner: 'Banner',
    no_badges: 'Keine',
    no_banner: 'Kein'
  },
  fr: {
    start_reply: 'Tu peux maintenant utiliser les commandes avec le préfixe `.`. Exemple : `.id` ou `.id 123456789012345678`',
    must_start: 'Tu dois d\'abord utiliser `/start`.',
    invalid_id: 'Tu dois fournir un ID Discord valide.',
    not_found: 'Aucun utilisateur trouvé avec cet ID ou une erreur est survenue.',
    title: 'Infos Utilisateur',
    id: 'ID',
    username: 'Nom d\'utilisateur',
    global_name: 'Nom global',
    created_at: 'Date de création',
    badges: 'Badges',
    avatar: 'Avatar',
    banner: 'Bannière',
    no_badges: 'Aucun',
    no_banner: 'Aucune'
  },
  es: {
    start_reply: 'Ahora puedes usar comandos con el prefijo `.`. Ejemplo: `.id` o `.id 123456789012345678`',
    must_start: 'Primero debes usar `/start`.',
    invalid_id: 'Debes proporcionar un ID de Discord válido.',
    not_found: 'No se encontró un usuario con este ID o ocurrió un error.',
    title: 'Información de Usuario',
    id: 'ID',
    username: 'Nombre de usuario',
    global_name: 'Nombre global',
    created_at: 'Fecha de creación',
    badges: 'Insignias',
    avatar: 'Avatar',
    banner: 'Banner',
    no_badges: 'Ninguna',
    no_banner: 'Ninguno'
  },
  ru: {
    start_reply: 'Теперь ты можешь использовать команды с префиксом `.`. Например: `.id` или `.id 123456789012345678`',
    must_start: 'Сначала нужно использовать `/start`.',
    invalid_id: 'Нужно указать корректный Discord ID.',
    not_found: 'Пользователь с таким ID не найден или произошла ошибка.',
    title: 'Информация о пользователе',
    id: 'ID',
    username: 'Имя пользователя',
    global_name: 'Глобальное имя',
    created_at: 'Дата создания',
    badges: 'Значки',
    avatar: 'Аватар',
    banner: 'Баннер',
    no_badges: 'Нет',
    no_banner: 'Нет'
  },
  ar: {
    start_reply: 'يمكنك الآن استخدام الأوامر ذات البادئة `.`. مثال: `.id` أو `.id 123456789012345678`',
    must_start: 'يجب عليك استخدام `/start` أولاً.',
    invalid_id: 'يجب عليك إدخال معرف Discord صالح.',
    not_found: 'لم يتم العثور على مستخدم بهذا المعرف أو حدث خطأ.',
    title: 'معلومات المستخدم',
    id: 'المعرف',
    username: 'اسم المستخدم',
    global_name: 'الاسم العالمي',
    created_at: 'تاريخ الإنشاء',
    badges: 'الشارات',
    avatar: 'الصورة الرمزية',
    banner: 'البانر',
    no_badges: 'لا يوجد',
    no_banner: 'لا يوجد'
  }
};

function t(lang, key) {
  const langData = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return langData[key] || TRANSLATIONS.en[key] || key;
}

const app = express();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Global error handlers: bot çökmesin diye hataları sadece logla
client.on('error', (err) => {
  console.error('Discord client error:', err);
});

client.on('shardError', (err) => {
  console.error('Discord shard error:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled promise rejection:', reason);
});

// Web server: static files
app.use(express.static('public'));
app.use('/badges', express.static('badges'));

client.once('ready', async () => {
  console.log(`Bot giriş yaptı: ${client.user.tag}`);

  // Slash komutu kaydı (/start)
  const commands = [
    {
      name: 'start',
      description: 'Enable the dot prefix commands of the bot',
      options: [
        {
          name: 'language',
          description: 'Dil / Language',
          type: 3,
          required: true,
          choices: [
            { name: 'Türkçe', value: 'tr' },
            { name: 'English', value: 'en' },
            { name: 'Deutsch', value: 'de' },
            { name: 'Français', value: 'fr' },
            { name: 'Español', value: 'es' },
            { name: 'Русский', value: 'ru' },
            { name: 'العربية', value: 'ar' }
          ]
        }
      ]
    }
  ];

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );
    console.log('/start komutu global olarak kaydedildi.');
  } catch (error) {
    console.error('Slash komut kaydedilirken hata:', error);
  }
});

// Slash komut handler
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === 'start') {
    const language = interaction.options.getString('language') || 'tr';
    activeUsers.set(interaction.user.id, { language });
    await interaction.reply({
      content: t(language, 'start_reply'),
      ephemeral: true
    });
  }
});

// Badge / public flaglerini emoji stringe çeviren helper
function formatFlags(user, language) {
  const flags = user.flags?.toArray?.() || user.publicFlags?.toArray?.() || [];
  if (!flags.length) return t(language, 'no_badges');

  // Verdiğin özel emoji ID'leri
  const emojiMap = {
    // Early Supporter
    PremiumEarlySupporter: '<:early:1443711524559519957>',
    // Bot Developer
    VerifiedDeveloper: '<:botdev:1443711541504512162>',
    // Bug Hunters
    BugHunterLevel1: '<:bughunter1:1443711566838108190>',
    BugHunterLevel2: '<:bughunter2:1443711551348408441>',
    // Certified Moderator
    CertifiedModerator: '<:certifiedmod:1443711511900979353>',
    // Discord Staff
    Staff: '<:staff:1424966455602188288>',
    // HypeSquad Houses
    HypeSquadOnlineHouse3: '<:hypesquad_balance:1443711527336153240>', // Balance
    HypeSquadOnlineHouse1: '<:hypesquad_bravery:1443711535141879930>', // Bravery
    HypeSquadOnlineHouse2: '<:hypesquad_brilliance:1443711555479801906>', // Brilliance
    // HypeSquad Events / General HypeSquad
    HypeSquadEvents: '<:hypesquad_events:1443711553810595961>',
    HypeSquad: '<:hypesquad_events:1443711553810595961>',
    hypesquad: '<:hypesquad_events:1443711553810595961>',
    // Discord Partner
    Partner: '<:partner:1443711528913076406>',
    // Active Developer
    ActiveDeveloper: '<:activedev:1443711538702581771>'
  };

  // Bilinmeyen rozetler için fallback: flag adını yazı olarak göster
  return flags
    .map((f) => {
      const direct = emojiMap[f];
      if (direct) return direct;
      const lower = typeof f === 'string' ? f.toLowerCase() : f;
      return emojiMap[lower] || f;
    })
    .join(' ');
}

// ID ile kullanıcı bilgisini çeken helper
async function fetchUserInfo(client, id) {
  try {
    const user = await client.users.fetch(id, { force: true });

    // Banner alabilmek için fetch yeterli, ancak bazı hesaplarda banner yok olur
    const avatarUrl = user.displayAvatarURL({ size: 512, extension: 'png' });
    const bannerUrl = typeof user.bannerURL === 'function'
      ? user.bannerURL({ size: 1024 }) || null
      : null;

    return { user, avatarUrl, bannerUrl };
  } catch (err) {
    console.error('Kullanıcı çekilirken hata:', err);
    return null;
  }
}

// HTTP API: /api/user/:id
app.get('/api/user/:id', async (req, res) => {
  const id = req.params.id;

  if (!/^\d{17,20}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid Discord ID format.' });
  }

  const info = await fetchUserInfo(client, id);
  if (!info) {
    return res.status(404).json({ error: 'User not found or could not be fetched.' });
  }

  const { user, avatarUrl, bannerUrl } = info;
  const createdUnix = Math.floor(user.createdTimestamp / 1000);

  const badges = formatFlags(user, 'en');

  // Badge PNG eşleşmeleri (badges klasöründeki dosyalar)
  const badgeImageMap = {
    Staff: '/badges/7871-discord-staff.png',
    Partner: '/badges/5477-partnered-server-owner.png',
    PremiumEarlySupporter: '/badges/5053-early-supporter.png',
    BugHunterLevel1: '/badges/1572-discord-bug-hunter.png',
    BugHunterLevel2: '/badges/9148-discord-gold-bug-hunter.png',
    CertifiedModerator: '/badges/2731-certified-moderator.png',
    HypeSquadEvents: '/badges/9171-hypesquad-events.png',
    HypeSquad: '/badges/9171-hypesquad-events.png',
    HypeSquadOnlineHouse1: '/badges/6601-hypesquad-bravery.png',
    HypeSquadOnlineHouse2: '/badges/9554-hypesquad-brilliance.png',
    HypeSquadOnlineHouse3: '/badges/5242-hypesquad-balance.png',
    ActiveDeveloper: '/badges/7011-active-developer-badge.png',
    VerifiedDeveloper: '/badges/7088-early-verified-bot-developer.png'
  };

  const flagList = user.flags?.toArray?.() || user.publicFlags?.toArray?.() || [];
  const badgeImages = flagList
    .map((f) => badgeImageMap[f])
    .filter(Boolean);

  return res.json({
    id: user.id,
    username: user.username,
    globalName: user.globalName || null,
    tag: user.tag,
    createdAt: user.createdAt,
    createdAtUnix: createdUnix,
    createdAtHuman: new Date(user.createdAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }),
    avatarUrl,
    bannerUrl: bannerUrl || null,
    badges,
    badgeImages
  });
});

// Mesaj (prefix) handler
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  // Kullanıcı daha önce /start kullanmış mı kontrol et
  if (!activeUsers.has(message.author.id)) {
    return message.reply(t('en', 'must_start'));
  }

  const settings = activeUsers.get(message.author.id) || { language: 'en' };
  const language = settings.language || 'en';

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()?.toLowerCase();

  if (command === 'id') {
    let targetId = args[0];

    if (!targetId) {
      targetId = message.author.id;
    }

    if (!/^\d{17,20}$/.test(targetId)) {
      return message.reply(t(language, 'invalid_id'));
    }

    const info = await fetchUserInfo(client, targetId);
    if (!info) {
      return message.reply(t(language, 'not_found'));
    }

    const { user, avatarUrl, bannerUrl } = info;

    const embed = new EmbedBuilder()
      .setTitle(`${t(language, 'title')}: ${user.tag}`)
      .setColor(0x5865F2)
      .setThumbnail(avatarUrl)
      .addFields(
        { name: t(language, 'id'), value: user.id, inline: true },
        { name: t(language, 'username'), value: `${user.username}`, inline: true },
        { name: t(language, 'global_name'), value: user.globalName || '\u2014', inline: true },
        { name: t(language, 'created_at'), value: `<t:${Math.floor(user.createdTimestamp / 1000)}:F>`, inline: false },
        { name: t(language, 'badges'), value: formatFlags(user, language), inline: false }
      )
      .setFooter({ text: 'Discord Official ID Lookup', iconURL: client.user.displayAvatarURL() });

    // Banner varsa embedin en altında göster, yoksa sadece sağdaki pp (thumbnail) kalsın
    if (bannerUrl) {
      embed.setImage(bannerUrl);
    }

    return message.reply({ embeds: [embed] });
  }
});

client.login(process.env.DISCORD_TOKEN);

app.listen(PORT, () => {
  console.log(`Web server listening on http://localhost:${PORT}`);
});
