import { HeroOrb } from './orb/HeroOrb.js';

const copy = {
  en: {
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.work': 'Work',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'hero.eyebrow': 'Digital studio for the Gulf',
    'hero.line1': 'We build',
    'hero.line2': 'digital experiences',
    'hero.line3': 'made for the Gulf.',
    'hero.lede':
      'QIRAM is a boutique agency for websites, web apps, UX/UI and brand systems — designed with the same level of detail in Arabic and English.',
    'hero.cta': 'Tell us what you’re building',
    'hero.secondary': 'See our work',
    'hero.scroll': 'Scroll',
    'services.kicker': 'Capabilities',
    'services.title': 'Quiet craft. Precise systems.',
    'services.web.title': 'Websites',
    'services.web.body':
      'Editorial marketing sites with bilingual structure, motion, and the restraint of a luxury brand.',
    'services.apps.title': 'Web apps',
    'services.apps.body':
      'Product interfaces that feel considered — clear hierarchy, calm interaction, and production-grade engineering.',
    'services.ux.title': 'UX / UI',
    'services.ux.body':
      'Research-led flows and visual systems designed for both Arabic and English from the first frame.',
    'services.brand.title': 'Brand systems',
    'services.brand.body':
      'Identity, type, and digital language that can live across campaigns, products, and the region.',
    'work.kicker': 'Selected work',
    'work.title': 'A few recent engagements.',
    'work.a.title': 'Maison Nur — private membership',
    'work.a.body': 'A bilingual digital house for a Gulf hospitality brand. Site, booking, and identity system.',
    'work.b.title': 'Hayy Finance — product OS',
    'work.b.body': 'A calm wealth platform with Arabic-first navigation and a glass-led visual language.',
    'work.c.title': 'Noor Labs — research studio',
    'work.c.body': 'An editorial presence for a climate studio, built to hold long-form work in two languages.',
    'about.kicker': 'Studio',
    'about.title': 'Built for the Gulf, in both languages.',
    'about.body':
      'QIRAM is a small digital studio working with ambitious teams across the GCC. We design and build websites, products, and brand systems with the same level of care in Arabic and English — quiet, precise, and made to last.',
    'contact.kicker': 'Contact',
    'contact.title': 'Tell us what you’re building.',
    'contact.name': 'Name',
    'contact.email': 'Email',
    'contact.message': 'Project',
    'contact.send': 'Send a note',
    'footer.mark': 'Digital studio for the Gulf',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.services': 'خدماتنا',
    'nav.work': 'أعمالنا',
    'nav.about': 'عن الاستوديو',
    'nav.contact': 'تواصل',
    'hero.eyebrow': 'استوديو رقمي للخليج',
    'hero.line1': 'نبني',
    'hero.line2': 'تجارب رقمية',
    'hero.line3': 'صُنعت للخليج.',
    'hero.lede':
      'قيرام استوديو متخصص في المواقع والتطبيقات وتجربة المستخدم وأنظمة الهوية — بنفس مستوى العناية بالعربية والإنجليزية.',
    'hero.cta': 'أخبرنا عما تبنيه',
    'hero.secondary': 'شاهد أعمالنا',
    'hero.scroll': 'تمرير',
    'services.kicker': 'القدرات',
    'services.title': 'حرفة هادئة. أنظمة دقيقة.',
    'services.web.title': 'مواقع',
    'services.web.body': 'مواقع تحريرية ثنائية اللغة بحركة محسوبة ورزانة العلامات الفاخرة.',
    'services.apps.title': 'تطبيقات ويب',
    'services.apps.body': 'واجهات منتج واضحة، تفاعل هادئ، وهندسة جاهزة للإنتاج.',
    'services.ux.title': 'تجربة وواجهة',
    'services.ux.body': 'تدفقات بحثية وأنظمة بصرية تُصمم للعربية والإنجليزية من الإطار الأول.',
    'services.brand.title': 'أنظمة هوية',
    'services.brand.body': 'هوية ولغة بصرية تعيش عبر الحملات والمنتجات والمنطقة.',
    'work.kicker': 'أعمال مختارة',
    'work.title': 'بعض التعاونات الأخيرة.',
    'work.a.title': 'ميزون نور — عضوية خاصة',
    'work.a.body': 'بيت رقمي ثنائي اللغة لعلامة ضيافة خليجية. موقع، حجز، ونظام هوية.',
    'work.b.title': 'حي فاينانس — نظام المنتج',
    'work.b.body': 'منصة ثروة هادئة بتنقّل عربي أولاً ولغة بصرية زجاجية.',
    'work.c.title': 'نور لابز — استوديو بحثي',
    'work.c.body': 'حضور تحريري لاستوديو مناخي يستوعب النصوص الطويلة بلغتين.',
    'about.kicker': 'الاستوديو',
    'about.title': 'صُمم للخليج، وباللغتين.',
    'about.body':
      'قيرام استوديو رقمي صغير يعمل مع فرق طموحة في الخليج. نصمم ونبني مواقع ومنتجات وأنظمة هوية بنفس العناية بالعربية والإنجليزية — بهدوء ودقة وثبات.',
    'contact.kicker': 'تواصل',
    'contact.title': 'أخبرنا عما تبنيه.',
    'contact.name': 'الاسم',
    'contact.email': 'البريد',
    'contact.message': 'المشروع',
    'contact.send': 'أرسل رسالة',
    'footer.mark': 'استوديو رقمي للخليج',
  },
};

function applyLanguage(lang) {
  const dict = copy[lang] || copy.en;
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = dict[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === lang);
  });
}

function initNav() {
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);

  const sync = () => {
    const y = window.scrollY + 120;
    let current = sections[0];
    sections.forEach((section) => {
      if (section.offsetTop <= y) current = section;
    });
    links.forEach((link) => {
      link.classList.toggle('is-active', link.getAttribute('href') === `#${current.id}` || (current.id === 'top' && link.getAttribute('href') === '#top'));
    });
  };
  window.addEventListener('scroll', sync, { passive: true });
  sync();
}

function initMenu() {
  const btn = document.querySelector('.menu-btn');
  const menu = document.querySelector('.mobile-menu');
  const close = () => {
    menu.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
  };
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('menu-open', open);
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', close));
}

const canvas = document.querySelector('#orb-canvas');
const hero = document.querySelector('.hero');
const orb = new HeroOrb(canvas, { hero });

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

document.querySelector('.contact-form')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button span');
  const original = button.textContent;
  button.textContent = document.documentElement.lang === 'ar' ? 'تم الإرسال' : 'Received';
  window.setTimeout(() => {
    button.textContent = original;
    event.currentTarget.reset();
  }, 1600);
});

initNav();
initMenu();

if (import.meta.hot) {
  import.meta.hot.dispose(() => orb.dispose());
}
