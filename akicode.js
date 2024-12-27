const { Client, Intents, Collection, MessageEmbed } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { joinVoiceChannel } = require('@discordjs/voice');
const fs = require('fs');
const { token, clientId, guildId, logChannel: logChannelId, maintenanceMode, afkChannelId } = require('./config.json');

const client = new Client({
    intents: [
        Intents.FLAGS.GUILDS,
        Intents.FLAGS.GUILD_MEMBERS,
        Intents.FLAGS.GUILD_MESSAGES,
        Intents.FLAGS.GUILD_VOICE_STATES // Ses kanalları için eklenmeli
    ],
});

client.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

const afk = require('./commands/afk'); // AFK komutu ve kullanıcıları yükle

// Komutları yükle
for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
}

// Slash komutlarını yükleme fonksiyonu
async function deployCommands() {
    const rest = new REST({ version: '9' }).setToken(token);
    try {
        console.log('Slash komutları yükleniyor...');

        await rest.put(
            Routes.applicationGuildCommands(clientId, guildId),
            { body: commands },
        );

        console.log('Slash komutları başarıyla yüklendi!');
    } catch (error) {
        console.error('Slash komutları yüklenirken bir hata oluştu:', error);
    }
}

client.once('ready', () => {
    console.log(`${client.user.tag} olarak giriş yapıldı!`);
    deployCommands();
    
    // Botu AFK kanalına bağlama
    const afkChannel = client.channels.cache.get(afkChannelId);
    if (afkChannel) {
        joinVoiceChannel({
            channelId: afkChannel.id,
            guildId: afkChannel.guild.id,
            adapterCreator: afkChannel.guild.voiceAdapterCreator,
        });
        console.log(`Bot AFK kanalına bağlandı: ${afkChannel.name}`);
    } else {
        console.error('AFK kanalı bulunamadı.');
    }
});

// Slash Komutları İşleyici
client.on('interactionCreate', async interaction => {
    if (!interaction.isCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Bakım modu kontrolü
    if (maintenanceMode && !interaction.member.permissions.has('ADMINISTRATOR')) {
        return interaction.reply({ content: 'Bot bakım modunda. Şu anda komutları kullanamazsınız.', ephemeral: true });
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Bu komutu çalıştırırken bir hata oluştu.', ephemeral: true });
    }
});

// Giriş Olayı
client.on('guildMemberAdd', async member => {
    const logChannel = member.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new MessageEmbed()
        .setTitle('Yeni Üye Katıldı')
        .setDescription(`${member.user.tag} sunucuya katıldı!`)
        .setColor(0x00ff00)
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
});

// Çıkış Olayı
client.on('guildMemberRemove', async member => {
    const logChannel = member.guild.channels.cache.get(logChannelId);
    if (!logChannel) return;

    const embed = new MessageEmbed()
        .setTitle('Üye Ayrıldı')
        .setDescription(`${member.user.tag} sunucudan ayrıldı.`)
        .setColor(0xff0000)
        .setTimestamp();

    logChannel.send({ embeds: [embed] });
});

// Öneri Kanalları İçin Mesaj Dinleyicisi
client.on('messageCreate', async message => {
    // Botun mesajlarına veya sistem mesajlarına tepki eklenmesin
    if (message.author.bot || message.system) return;

    if (maintenanceMode && !message.member.permissions.has('ADMINISTRATOR')) {
        return message.reply('Bot bakım modunda. Şu anda komutları kullanamazsınız.');
    }

    // "sa" yazıldığında "AleykümSelam" cevabı verme
    if (message.content.toLowerCase() === 'sa') {
        message.channel.send('AleykümSelam');
    }

    // "ip" yazıldığında sunucu IP adresini gönderme
    if (message.content.toLowerCase() === 'ip') {
        message.channel.send('Sunucumuzun İp Adresi : Play.Vizyon.Com');
    }

    // "selamunaleyküm" yazıldığında "Aleyküm Selam" cevabı verme
    if (message.content.toLowerCase() === 'selamunaleyküm') {
        message.channel.send('Aleyküm Selam');
    }

    // AFK durumunu kontrol et
    if (afk.afkUsers.has(message.author.id)) {
        afk.afkUsers.delete(message.author.id);
        await message.reply('AFK modundan çıktınız.');
    }

    // Kullanıcı etiketlendiğinde AFK kontrolü
    if (message.mentions.users.size > 0) {
        message.mentions.users.forEach(user => {
            if (afk.afkUsers.has(user.id)) {
                message.reply(`${user.tag} şu anda AFK. Sebep: ${afk.afkUsers.get(user.id)}`);
            }
        });
    }
    
    const dbPath = './suggestion_channels.json';  // Öneri kanal bilgileri

    if (!fs.existsSync(dbPath)) return;

    const suggestionChannels = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));

    const channelId = suggestionChannels[message.guild.id];  // Sunucuya ait öneri kanalı ID'si
    if (message.channel.id === channelId) {
        try {
            await message.react('🟢');  // Onay tepkisi
            await message.react('🔴');  // Red tepkisi
        } catch (error) {
            console.error('Tepki eklerken bir hata oluştu:', error);
        }
    }
});

client.login(token);
