<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class HumasPasswordResetNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $token
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontendUrl = rtrim(
            (string) config(
                'humas.frontend_url',
                'http://localhost:5173'
            ),
            '/'
        );

        $query = http_build_query([
            'mode' => 'reset',
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], '', '&', PHP_QUERY_RFC3986);

        $resetUrl = $frontendUrl . '/login?' . $query;

        return (new MailMessage)
            ->subject(
                'Reset Password - HUMAS & SEKPiM'
            )
            ->greeting(
                'Halo, ' . $notifiable->name . '!'
            )
            ->line(
                'Kami menerima permintaan pengaturan ulang '
                . 'password untuk akun HUMAS & SEKPiM Anda.'
            )
            ->line(
                'Klik tombol berikut untuk membuat password baru.'
            )
            ->action(
                'Atur Ulang Password',
                $resetUrl
            )
            ->line(
                'Tautan ini berlaku selama 60 menit '
                . 'dan hanya dapat digunakan satu kali.'
            )
            ->line(
                'Jika Anda tidak merasa meminta perubahan password, '
                . 'abaikan email ini.'
            )
            ->salutation(
                'Tim HUMAS & SEKPiM'
            );
    }
}
