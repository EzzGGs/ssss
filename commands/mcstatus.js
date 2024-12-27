const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const util = require('minecraft-server-util');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mcstatus')
        .setDescription('Minecraft sunucusunun durumunu belirtilen kanala gönderir.')
        .addChannelOption(option =>
            option.setName('kanal')
                .setDescription('Minecraft durumu mesajlarının gönderileceği kanal')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('sunucu')
                .setDescription('Minecraft sunucusunun adresi (IP:PORT)')
                .setRequired(true)
        ),
    async execute(interaction) {
        // Yönetici yetkisi kontrolü
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply({ content: 'Bu komutu kullanmak için gerekli yetkiniz yok.', ephemeral: true });
        }

        const channel = interaction.options.getChannel('kanal');
        const serverAddress = interaction.options.getString('sunucu');

        if (channel.type !== 'GUILD_TEXT') {
            return interaction.reply({ content: 'Lütfen bir metin kanalı seçin.', ephemeral: true });
        }

        const [host, port = 25565] = serverAddress.split(':');
        await interaction.reply({ content: `${channel} kanalında ${serverAddress} sunucusunun durumu her dakika güncellenecek.`, ephemeral: true });

        const { client } = interaction;
        let messageInstance;

        const updateStatus = async () => {
            try {
                const response = await util.status(host, parseInt(port));

                const embed = new MessageEmbed()
                    .setColor('#00FF00')
                    .setTitle('Minecraft Sunucu Durumu')
                    .setThumbnail(client.user.displayAvatarURL())
                    .addFields(
                        { name: 'Sunucu', value: `\`${serverAddress}\``, inline: false },
                        { name: 'Durum', value: '🟢 Açık', inline: true },
                        { name: 'Oyuncular', value: `${response.players.online}/${response.players.max}`, inline: true },
                        { name: 'Ping', value: `${response.latency}ms`, inline: true }
                    )
                    .setTimestamp();

                if (messageInstance) {
                    await messageInstance.edit({ embeds: [embed] });
                } else {
                    messageInstance = await channel.send({ embeds: [embed] });
                }

            } catch (error) {
                console.error(`Sunucuya bağlanılamadı: ${error}`);

                const embed = new MessageEmbed()
                    .setColor('#FF0000')
                    .setTitle('Minecraft Sunucu Durumu')
                    .setThumbnail(client.user.displayAvatarURL())
                    .addFields(
                        { name: 'Sunucu', value: `\`${serverAddress}\``, inline: false },
                        { name: 'Durum', value: '🔴 Kapalı', inline: true }
                    )
                    .setTimestamp();

                if (messageInstance) {
                    await messageInstance.edit({ embeds: [embed] });
                } else {
                    messageInstance = await channel.send({ embeds: [embed] });
                }
            }
        };

        updateStatus(); // İlk durumu hemen gönder
        const interval = setInterval(updateStatus, 60000); // Her 1 dakikada bir güncelle

        client.once('shutdown', () => clearInterval(interval));
    },
};
