import { HeroOrb } from './orb/HeroOrb.js';
import { FloatingLines } from './lines/FloatingLines.js';
import { initGooeyNav } from './nav/GooeyNav.js';
import { initMobileMenu } from './nav/MobileMenu.js';
import { initCopy, revertCopy } from './text/Copy.js';
import { initSmoothScroll } from './scroll/smooth.js';

const copy = {
  en: {
    'nav.home': 'Home',
    'nav.services': 'Services',
    'nav.work': 'Work',
    'nav.about': 'About',
    'nav.contact': 'Contact',
    'nav.menu': 'Menu',
    'nav.close': 'Close',
    'hero.eyebrow': 'Digital studio for the Gulf',
    'hero.line1': 'We build',
    'hero.line2': 'digital experiences',
    'hero.line3': 'made for the Gulf.',
    'hero.lede':
      'QIRAM is a boutique agency for websites, web apps, UX/UI and brand systems — designed with the same level of detail in Arabic and English.',
    'hero.cta': 'Tell us what you’re building',
    'hero.secondary': 'See our work',
    'hero.scroll': 'Scroll',
    'services.kicker': 'Our services',
    'services.title.lead': 'Everything you need to build, grow and ',
    'services.title.accent': 'stand out.',
    'services.lede': 'End-to-end digital solutions for ambitious brands across the GCC.',
    'services.explore': 'Explore all services',
    'services.web.title': 'Web Design & Development',
    'services.web.body':
      'Modern, fast and scalable websites built for performance, user experience and business growth.',
    'services.apps.title': 'Web Apps & Platforms',
    'services.apps.body':
      'Custom web applications and digital platforms designed for scale, efficiency and long-term success.',
    'services.ux.title': 'UX/UI & Product Design',
    'services.ux.body':
      'User-centered design systems and interfaces that turn ideas into seamless experiences.',
    'services.brand.title': 'Branding & Identity',
    'services.brand.body':
      'Distinctive brand identities, visual systems and guidelines that build recognition and trust.',
    'work.kicker': 'Selected work',
    'work.title': 'A few recent engagements.',
    'work.a.title': 'Maison Nur — private membership',
    'work.a.body': 'A bilingual digital house for a Gulf hospitality brand. Site, booking, and identity system.',
    'work.b.title': 'Hayy Finance — product OS',
    'work.b.body': 'A calm wealth platform with Arabic-first navigation and a glass-led visual language.',
    'work.c.title': 'Noor Labs — research studio',
    'work.c.body': 'An editorial presence for a climate studio, built to hold long-form work in two languages.',
    'process.kicker': 'Our process',
    'process.title.lead': 'A clear path from idea to ',
    'process.title.accent': 'impact.',
    'process.lede':
      'We shape ideas into digital experiences through a structured, collaborative and human-centered process. Here’s how we turn vision into real outcomes.',
    'process.1.title': 'Discover',
    'process.1.body': 'We learn about your goals, audience and market.',
    'process.2.title': 'Shape',
    'process.2.body': 'We define the strategy, structure and design.',
    'process.3.title': 'Build',
    'process.3.body': 'We develop, test and bring it to life.',
    'process.4.title': 'Launch',
    'process.4.body': 'We go live and support your continued growth.',
    'about.title.a': 'The point is ',
    'about.title.not': 'not',
    'about.title.b': ' to make a website. The point is to make your business feel ',
    'about.title.end': 'inevitable.',
    'about.lede':
      'We design and develop in both English and Arabic, creating seamless, culturally relevant experiences for the GCC market.',
    'about.p1.title': 'Bilingual by design',
    'about.p1.body': 'English + Arabic.',
    'about.p2.title': 'Regionally aligned',
    'about.p2.body': 'GCC market expertise.',
    'about.p3.title': 'Future ready',
    'about.p3.body': 'Built for what’s next.',
    'about.trusted': 'Trusted by forward-thinking brands',
    'about.more': '+ and more',
    'contact.kicker': 'Send us a message',
    'contact.title': 'Tell us about your project.',
    'contact.lede':
      'Share a few details about what you’re building, your timeline and goals. The more we know, the better we can help.',
    'contact.name': 'Full name',
    'contact.name.ph': 'Full name *',
    'contact.email': 'Email address',
    'contact.email.ph': 'Email address *',
    'contact.company': 'Company name',
    'contact.company.ph': 'Company name',
    'contact.phone': 'Mobile number',
    'contact.phone.ph': 'Mobile number',
    'contact.type': 'Project type',
    'contact.type.ph': 'Select an option',
    'contact.type.web': 'Website',
    'contact.type.app': 'Web app',
    'contact.type.ux': 'UX/UI',
    'contact.type.brand': 'Branding',
    'contact.type.other': 'Other',
    'contact.message': 'Tell us about your project',
    'contact.message.ph': 'Your message..',
    'contact.send': 'Send message',
    'footer.mark': 'Digital studio for the Gulf',
  },
  ar: {
    'nav.home': 'الرئيسية',
    'nav.services': 'خدماتنا',
    'nav.work': 'أعمالنا',
    'nav.about': 'عن الاستوديو',
    'nav.contact': 'تواصل',
    'nav.menu': 'القائمة',
    'nav.close': 'إغلاق',
    'hero.eyebrow': 'استوديو رقمي للخليج',
    'hero.line1': 'نبني',
    'hero.line2': 'تجارب رقمية',
    'hero.line3': 'صُنعت للخليج.',
    'hero.lede':
      'قيرام استوديو متخصص في المواقع والتطبيقات وتجربة المستخدم وأنظمة الهوية — بنفس مستوى العناية بالعربية والإنجليزية.',
    'hero.cta': 'أخبرنا عما تبنيه',
    'hero.secondary': 'شاهد أعمالنا',
    'hero.scroll': 'تمرير',
    'services.kicker': 'خدماتنا',
    'services.title.lead': 'كل ما تحتاجه لتبني وتنمو و',
    'services.title.accent': 'تتميز.',
    'services.lede': 'حلول رقمية متكاملة للعلامات الطموحة في دول الخليج.',
    'services.explore': 'استكشف كل الخدمات',
    'services.web.title': 'تصميم وتطوير المواقع',
    'services.web.body': 'مواقع حديثة وسريعة وقابلة للتوسع، مبنية للأداء وتجربة المستخدم ونمو الأعمال.',
    'services.apps.title': 'تطبيقات ومنصات ويب',
    'services.apps.body': 'تطبيقات ومنصات رقمية مصممة للتوسع والكفاءة والنجاح طويل الأمد.',
    'services.ux.title': 'تجربة المستخدم وتصميم المنتج',
    'services.ux.body': 'أنظمة تصميم وواجهات تتمحور حول المستخدم وتحوّل الأفكار إلى تجارب سلسة.',
    'services.brand.title': 'الهوية والعلامة',
    'services.brand.body': 'هويات بصرية وأنظمة إرشادية تبني التعرف والثقة.',
    'work.kicker': 'أعمال مختارة',
    'work.title': 'بعض التعاونات الأخيرة.',
    'work.a.title': 'ميزون نور — عضوية خاصة',
    'work.a.body': 'بيت رقمي ثنائي اللغة لعلامة ضيافة خليجية. موقع، حجز، ونظام هوية.',
    'work.b.title': 'حي فاينانس — نظام المنتج',
    'work.b.body': 'منصة ثروة هادئة بتنقّل عربي أولاً ولغة بصرية زجاجية.',
    'work.c.title': 'نور لابز — استوديو بحثي',
    'work.c.body': 'حضور تحريري لاستوديو مناخي يستوعب النصوص الطويلة بلغتين.',
    'process.kicker': 'عمليتنا',
    'process.title.lead': 'مسار واضح من الفكرة إلى ',
    'process.title.accent': 'الأثر.',
    'process.lede':
      'نحوّل الأفكار إلى تجارب رقمية عبر عملية منظمة وتعاونية تتمحور حول الإنسان. هكذا نحوّل الرؤية إلى نتائج حقيقية.',
    'process.1.title': 'اكتشف',
    'process.1.body': 'نتعرّف على أهدافك وجمهورك والسوق.',
    'process.2.title': 'شكّل',
    'process.2.body': 'نحدّد الاستراتيجية والبنية والتصميم.',
    'process.3.title': 'ابنِ',
    'process.3.body': 'نطوّر ونختبر ونحوّله إلى واقع.',
    'process.4.title': 'أطلق',
    'process.4.body': 'نطلق المشروع وندعم نموّك المستمر.',
    'about.title.a': 'الغاية ',
    'about.title.not': 'ليست',
    'about.title.b': ' صنع موقع. الغاية أن تجعل عملك يبدو ',
    'about.title.end': 'حتمياً.',
    'about.lede':
      'نصمم ونطور بالإنجليزية والعربية لتقديم تجارب رقمية سلسة ومتكاملة ثقافياً لسوق دول الخليج.',
    'about.p1.title': 'ثنائي اللغة بالتصميم',
    'about.p1.body': 'الإنجليزية والعربية.',
    'about.p2.title': 'متوافق إقليمياً',
    'about.p2.body': 'خبرة سوق الخليج.',
    'about.p3.title': 'جاهز للمستقبل',
    'about.p3.body': 'مبني لما هو قادم.',
    'about.trusted': 'موثوق به من علامات تفكّر بالمستقبل',
    'about.more': '+ والمزيد',
    'contact.kicker': 'أرسل لنا رسالة',
    'contact.title': 'أخبرنا عن مشروعك.',
    'contact.lede':
      'شاركنا بعض التفاصيل عما تبنيه، والجدول الزمني والأهداف. كلما عرفنا أكثر، ساعدنا بشكل أفضل.',
    'contact.name': 'الاسم الكامل',
    'contact.name.ph': 'الاسم الكامل *',
    'contact.email': 'البريد الإلكتروني',
    'contact.email.ph': 'البريد الإلكتروني *',
    'contact.company': 'اسم الشركة',
    'contact.company.ph': 'اسم الشركة',
    'contact.phone': 'رقم الجوال',
    'contact.phone.ph': 'رقم الجوال',
    'contact.type': 'نوع المشروع',
    'contact.type.ph': 'اختر خياراً',
    'contact.type.web': 'موقع',
    'contact.type.app': 'تطبيق ويب',
    'contact.type.ux': 'تجربة المستخدم',
    'contact.type.brand': 'هوية',
    'contact.type.other': 'أخرى',
    'contact.message': 'أخبرنا عن مشروعك',
    'contact.message.ph': 'رسالتك..',
    'contact.send': 'أرسل الرسالة',
    'footer.mark': 'استوديو رقمي للخليج',
  },
};

function applyLanguage(lang) {
  revertCopy();
  const dict = copy[lang] || copy.en;
  document.documentElement.lang = lang === 'ar' ? 'ar' : 'en';
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = dict[node.dataset.i18n];
    if (value) node.textContent = value;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
    const value = dict[node.dataset.i18nPlaceholder];
    if (value) node.setAttribute('placeholder', value);
  });
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.classList.toggle('is-active', btn.dataset.lang === lang);
  });
  gooeyNavs.forEach((nav) => nav.refresh());
  document.querySelectorAll('.bilingual').forEach((section) => {
    section.dataset.siteLang = lang;
  });
  contactSelect?.refresh();
  try {
    initCopy();
  } catch {
    revealCopy();
  }
}

const gooeyNavs = [
  initGooeyNav(document.querySelector('.nav-links')),
  initGooeyNav(document.querySelector('.mobile-nav-links')),
];

function currentSectionHref() {
  const links = [...document.querySelectorAll('.nav-links a')];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute('href')))
    .filter(Boolean);
  const y = window.scrollY + 120;
  let current = sections[0];
  sections.forEach((section) => {
    if (section.offsetTop <= y) current = section;
  });
  if (!current) return '#top';
  return current.id === 'top' ? '#top' : `#${current.id}`;
}

function syncGooey(options) {
  const href = currentSectionHref();
  gooeyNavs.forEach((nav) => nav.setActiveFromHref(href, options));
}

function setNavScrolled() {
  const nav = document.querySelector('.nav');
  if (!nav) return;
  nav.classList.toggle('is-scrolled', window.scrollY > 12);
}

function initNav() {
  window.addEventListener('resize', () => syncGooey(), { passive: true });
  syncGooey();
  setNavScrolled();
}

const canvas = document.querySelector('#orb-canvas');
const hero = document.querySelector('.hero');
const orb = new HeroOrb(canvas, { hero });
const linesEl = document.querySelector('.page-lines');
const lines = linesEl ? new FloatingLines(linesEl) : null;

document.querySelectorAll('.lang-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
  btn.addEventListener('click', () => {
    applyLanguage(document.documentElement.lang === 'ar' ? 'en' : 'ar');
  });
});

const contactForm = document.querySelector('.contact-form');
const contactCount = contactForm?.querySelector('[data-count]');
contactForm?.querySelector('textarea')?.addEventListener('input', (event) => {
  if (contactCount) contactCount.textContent = String(event.currentTarget.value.length);
});

function initContactSelect() {
  const wrap = document.querySelector('.contact-select');
  const native = wrap?.querySelector('select');
  const btn = wrap?.querySelector('.contact-select-btn');
  const list = wrap?.querySelector('.contact-select-list');
  const label = btn?.querySelector('span');
  if (!wrap || !native || !btn || !list || !label) {
    return { refresh() {} };
  }

  const close = () => {
    list.hidden = true;
    btn.setAttribute('aria-expanded', 'false');
  };

  const refresh = () => {
    const current = native.value;
    list.replaceChildren();
    [...native.options]
      .filter((opt) => opt.value)
      .forEach((opt) => {
        const item = document.createElement('li');
        item.setAttribute('role', 'option');
        item.dataset.value = opt.value;
        item.textContent = opt.textContent;
        item.classList.toggle('is-active', opt.value === current);
        item.addEventListener('click', () => {
          native.value = opt.value;
          label.textContent = opt.textContent;
          btn.classList.add('is-chosen');
          close();
          refresh();
        });
        list.append(item);
      });

    if (current) {
      label.textContent = native.selectedOptions[0]?.textContent || current;
      btn.classList.add('is-chosen');
    } else {
      label.textContent = native.options[0]?.textContent || '';
      btn.classList.remove('is-chosen');
    }
  };

  btn.addEventListener('click', () => {
    const open = list.hidden;
    list.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) close();
  });

  refresh();
  return { refresh };
}

const contactSelect = initContactSelect();

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button span');
  const original = button.textContent;
  button.textContent = document.documentElement.lang === 'ar' ? 'تم الإرسال' : 'Received';
  window.setTimeout(() => {
    button.textContent = original;
    event.currentTarget.reset();
    if (contactCount) contactCount.textContent = '0';
    contactSelect.refresh();
  }, 1600);
});

function initServiceGlow() {
  const cards = document.querySelectorAll('.service-card');
  cards.forEach((card) => {
    if (!card.querySelector('.edge-light')) {
      const glow = document.createElement('span');
      glow.className = 'edge-light';
      glow.setAttribute('aria-hidden', 'true');
      card.prepend(glow);
    }

    let rect = null;
    const pointer = { x: 0, y: 0 };

    const update = () => {
      if (!rect) return;
      const x = pointer.x - rect.left;
      const y = pointer.y - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
      const edge = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      let angle = 0;
      if (dx !== 0 || dy !== 0) {
        angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angle < 0) angle += 360;
      }
      card.style.setProperty('--edge-proximity', (edge * 100).toFixed(3));
      card.style.setProperty('--cursor-angle', `${angle.toFixed(3)}deg`);
    };

    card.addEventListener('pointerenter', () => {
      rect = card.getBoundingClientRect();
      card.classList.add('is-glowing');
    });
    card.addEventListener('pointermove', (event) => {
      if (!rect) rect = card.getBoundingClientRect();
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      update();
    });
    card.addEventListener('pointerleave', () => {
      rect = null;
      card.classList.remove('is-glowing');
      card.style.setProperty('--edge-proximity', '0');
    });
  });
}

const lenis = initSmoothScroll({
  onScroll: () => {
    syncGooey();
    setNavScrolled();
  },
});

initNav();
initMobileMenu(lenis);
initServiceGlow();

function revealCopy() {
  document.querySelectorAll('[data-copy]').forEach((el) => el.classList.add('is-copy-ready'));
}

const fontsReady = document.fonts?.ready || Promise.resolve();
fontsReady.then(() => {
  try {
    initCopy();
  } catch {
    revealCopy();
  }
}).catch(revealCopy);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    orb.dispose();
    lines?.dispose();
    lenis?.destroy();
  });
}
