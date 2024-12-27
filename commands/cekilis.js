const { SlashCommandBuilder } = require('@discordjs/builders');
const { MessageEmbed } = require('discord.js');
const ms = require('ms'); // ms modülünü yüklemeniz gerekecek: npm install ms

module.exports = {
    data: new SlashCommandBuilder()
        .setName('cekilis')
        .setDescription('Bir çekiliş başlatır.')
        .addStringOption(option => 
            option.setName('süre')
                .setDescription('Çekilişin süresi. Örn: 1m, 1h, 1d')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('ödül')
                .setDescription('Çekiliş ödülü')
                .setRequired(true)),

    async execute(interaction) {
        // Kullanıcının yönetici izni olup olmadığını kontrol et
        if (!interaction.member.permissions.has('ADMINISTRATOR')) {
            return interaction.reply('Bu komutu kullanmak için yönetici iznine sahip olmanız gerekmektedir.');
        }

        const süre = interaction.options.getString('süre');
        const ödül = interaction.options.getString('ödül');

        const embed = new MessageEmbed()
            .setTitle('Çekiliş Başladı!')
            .setDescription(`Katılmak için 🎉 tepkisine tıklayın.\n\nÖdül: **${ödül}**`)
            .setColor(0x00ff00)
            .setTimestamp()
            .setFooter({ text: `Çekiliş süresi: ${süre}` });

        const message = await interaction.reply({ embeds: [embed], fetchReply: true });
        message.react('🎉');

        setTimeout(async () => {
            const fetchedMessage = await message.fetch();
            const users = fetchedMessage.reactions.cache.get('🎉').users.cache.filter(u => !u.bot);
            const winner = users.random();

            if (winner) {
                const winnerEmbed = new MessageEmbed()
                    .setTitle('Çekiliş Sonucu')
                    .setDescription(`🎉 Tebrikler, **${winner.tag}**! Ödülü kazandınız: **${ödül}**`)
                    .setColor(0xffd700)
                    .setTimestamp();

                await interaction.followUp({ embeds: [winnerEmbed] });
            } else {
                await interaction.followUp('Çekilişe kimse katılmadı.');
            }
        }, ms(süre));
    },
};
