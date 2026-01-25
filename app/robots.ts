import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/private'],
        },
        sitemap: 'https://safevault-app.vercel.app/sitemap.xml',
    };
}
