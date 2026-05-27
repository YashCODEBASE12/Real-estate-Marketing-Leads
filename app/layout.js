import './globals.css'

export const metadata = {
  title: 'NCR Realty - Lead Chatbot',
  description: 'Premium real estate chatbot',
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body style={{ margin: 0, padding: 0, background: '#0a0a0a', overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  )
}
