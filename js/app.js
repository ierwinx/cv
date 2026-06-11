(() => {
  const CAREER_START = 2013;
  const yearsExp = new Date().getFullYear() - CAREER_START;

  const TRANSLATIONS = {
    en: {
      nav: { langToggle: "ES", themeToggle: "Theme" },
      hero: {
        name: "Erwin De La Luz De León",
        title: "Mobile Software Engineer",
        bio: `Software Engineer with over ${yearsExp}+ years of experience leading and developing software solutions in production environments. Strong focus on native mobile development, scalable architectures, and DevSecOps practices, with experience in AWS, server administration, and both relational and non-relational databases.`,
        available: "Available for projects",
        download: "Download CV",
        cvFile: "CV/En.pdf"
      },
      info: {
        heading: "Information",
        address: "Cuauhtémoc, 06720, Mexico City",
        web: "ierwinx.com",
        languages: "Languages",
        langSpanish: "Spanish - Native",
        langEnglish: "English - Intermediate B1"
      },
      social: { heading: "Social Networks" },
      skills: {
        heading: "Skills",
        mobile: "Mobile",
        frontend: "Frontend",
        backend: "Backend",
        database: "Databases",
        architecture: "Architectural Patterns",
        devops: "DevOps & Cloud"
      },
      testimonial: {
        quote: "Erwin is the kind of engineer who not only delivers exceptional results, but elevates the entire team around him. His ability to lead complex mobile projects while maintaining code quality is outstanding.",
        role: "Chief — Garante / Gpo Proyectos Estrategias Empresariales"
      },
      projects: {
        heading: "Featured Projects",
        list: [
          {
            name: "PagApp",
            role: "Tech Lead & iOS Developer",
            description: "Interbank transfer platform processing millions of transactions daily. Led mobile architecture and delivery.",
            tags: ["Swift", "Kotlin"],
            emoji: "🏦",
            url: "https://pagapp.mx"
          },
          {
            name: "STPCodig",
            role: "Tech Lead & iOS Developer",
            description: "Payment and collection solution powered by CoDi® (BANXICO) enabling merchants and businesses to send and receive payments seamlessly.",
            tags: ["Swift", "Kotlin"],
            emoji: "💸",
            url: "https://stp.mx/app-codig/"
          },
          {
            name: "Super App BAZ",
            role: "Tech Lead & iOS Developer",
            description: "All-in-one super app featuring payments, transfers, movie streaming, social networking, and marketplace — serving millions of users.",
            tags: ["Swift"],
            emoji: "📱",
            url: "https://www.baz.app"
          },
          {
            name: "Banco Azteca",
            role: "iOS Developer Sr",
            description: "Core banking mobile app serving 10M+ users across Latin America.",
            tags: ["Swift", "Objective-C"],
            emoji: "💳",
            url: "https://www.bancoazteca.com.mx/app/app-banco-azteca.html"
          },
          {
            name: "Encuentro Católico",
            role: "iOS Developer",
            description: "Social and community platform for religious events and content.",
            tags: ["Swift", "Firebase", "MongoDB"],
            emoji: "⛪",
            url: null
          }
        ]
      },
      experience: {
        heading: "Work Experience",
        jobs: [
          {
            period: "2022 - Present",
            company: "Sistema De Transferencias y Pagos STP",
            roles: ["Tech Lead", "iOS Developer Sr"],
            description: "Technical lead for mobile applications on iOS, Android, and Backend. Responsible for making architecture decisions, participating directly in development, and aligning technically with business and product teams to deliver scalable and compliant solutions, leveraging AI tools like Claude Code."
          },
          {
            period: "2018 - 2022",
            company: "Grupo Salinas / Banco Azteca",
            roles: ["Tech Lead", "Manager", "iOS Developer Sr", "Cloud Architect", "DevOps"],
            description: "Led development within a team for applications including Banco Azteca, Super App BAZ, and Encuentro Católico. Collaborated closely with design, product, and business teams, defining roadmaps and aligning technical execution with business goals. Coordinated cross-functional teams (Back-end, Front-end, QA, UX). Implemented CI/CD pipelines, cloud architectures on AWS, and containerized deployments using Docker, Kubernetes, and OpenShift. Developed backend services with Node.js and MongoDB."
          },
          {
            period: "2015 - 2018",
            company: "Grupo Proyectos Estrategias Empresariales",
            roles: ["Java Developer Sr", "Java Developer Jr"],
            description: "Designed and implemented backend solutions in Java for payroll systems, ensuring reliability and data integrity. Contributed to the development of a digital platform for psychologists, focused on secure and scalable backend services."
          },
          {
            period: "2014 - 2015",
            company: "Grupo ID Soft, ISC Control Inteligente",
            roles: ["Android Developer Jr"],
            description: "Implemented geolocation-based attendance systems on Android, focusing on reliability, accuracy, and efficient location validation for workforce management."
          },
          {
            period: "2013 - 2014",
            company: "Secretaría de Gobernación",
            roles: ["Android Developer"],
            description: "Participated in the development on Android of a country-wide infrastructure monitoring platform, detecting link outages and triggering alerts to responsible administrators to reduce downtime."
          }
        ]
      },
      education: {
        heading: "Education",
        degree: {
          period: "2009 - 2013",
          institution: "Tecnológico de Estudios Superiores de Chalco",
          career: "Computer Systems Engineer",
          specialtyLabel: "Specialty",
          specialty: "Web Systems Development"
        },
        certifications: "Courses",
        certs: [
          { year: "2020", name: "iOS 12 & Swift 4", institution: "Udemy", img: "ios12" },
          { year: "2020", name: "iOS App Development", institution: "Platzi", img: "ios-desarrollo" },
          { year: "2020", name: "iOS Interface Development", institution: "Platzi", img: "ios-diseno" },
          { year: "2020", name: "OOP with Swift", institution: "Platzi", img: "swift-poo" },
          { year: "2020", name: "Functions in Swift", institution: "Platzi", img: "swift-funciones" },
          { year: "2020", name: "Swift Programming", institution: "Platzi", img: "swift" },
          { year: "2020", name: "Swift Fundamentals", institution: "Platzi", img: "swift-fundamentos" },
          { year: "2020", name: "Android Interface Design", institution: "Platzi", img: "interfaces-android" },
          { year: "2020", name: "Kotlin for Android", institution: "Platzi", img: "kotlin-android" },
          { year: "2020", name: "Android Technical Foundations", institution: "Platzi", img: "tecnico-android" },
          { year: "2020", name: "Kotlin", institution: "Platzi", img: "kotlin" },
          { year: "2020", name: "ReactJS", institution: "Udemy", img: "react" },
          { year: "2020", name: "Red Hat OpenShift Development I", institution: "Red Hat", img: "Redhat openshift" },
          { year: "2019", name: "Intro to Containers & Kubernetes", institution: "Red Hat", img: "Redhat intro contenedores" },
          { year: "2019", name: "Red Hat System Administration II", institution: "Red Hat", img: "Redhat admin 2" },
          { year: "2019", name: "Red Hat System Administration I", institution: "Red Hat", img: "Redhat admin 1" },
          { year: "2019", name: "Architecting on AWS", institution: "Netec", img: "arquitecto aws" },
          { year: "2019", name: "Go Programming", institution: "Platzi", img: "go" },
          { year: "2019", name: "Introduction to DevSecOps", institution: "Grupo Salinas", img: "DevSecOps" },
          { year: "2018", name: "Jenkins", institution: "Udemy", img: "jenkins" },
          { year: "2017", name: "Oracle Database 12c: Admin", institution: "IPN ESCOM", img: "Oracle 2" },
          { year: "2017", name: "Oracle Database 12c: SQL & PLSQL", institution: "IPN ESCOM", img: "Oracle 1" },
          { year: "2017", name: "Web Development with Spring 4.3", institution: "Udemy", img: "spring 2" },
          { year: "2015", name: "Java & Spring, Hibernate", institution: "IPN UPIITA", img: "spring" },
          { year: "2014", name: "Front-end with HTML5, jQuery & Git", institution: "IPN UPIITA", img: "html5" }
        ]
      },
      references: {
        heading: "References",
        showBtn: "Show references",
        hideBtn: "Hide references",
        list: [
          { name: "Jesús Fernando Ciriaco", role: "STP Chief Technology", phone: "55 6680 6922" },
          { name: "Jorge Luis Pilo", role: "STP Mobile Apps Manager", phone: "55 7803 8252" },
          { name: "Miguel Hernández", role: "Banco Azteca Chief", phone: "55 30 45 86 15" },
          { name: "Carlos Altamirano", role: "Garante / Gpo Proyectos Estrategias Empresariales Chief", phone: "55 16 33 81 77" },
          { name: "Carlos Ortíz", role: "Banco Azteca Chief", phone: "55 56 18 42 73 93" },
          { name: "Mauricio Serna", role: "ID Soft Chief CEO", phone: "55 24 54 43 60" }
        ]
      },
      contact: {
        heading: "Send a message",
        name: "Name",
        lastName: "Last Name",
        company: "Company",
        email: "Email",
        message: "Message",
        send: "Send",
        sending: "Sending information",
        success: "The information has been sent correctly",
        error: "There were problems sending the information",
        recaptchaError: "This field is required"
      }
    },
    es: {
      nav: { langToggle: "EN", themeToggle: "Tema" },
      hero: {
        name: "Erwin De La Luz De León",
        title: "Mobile Software Engineer",
        bio: `Ingeniero de Software con más de ${yearsExp}+ años de experiencia liderando y desarrollando soluciones de software en entornos de producción. Especializado en desarrollo móvil nativo, arquitecturas escalables y prácticas DevSecOps, con experiencia en AWS, administración de servidores y bases de datos relacionales y no relacionales.`,
        available: "Disponible para proyectos",
        download: "Descargar CV",
        cvFile: "CV/Es.pdf"
      },
      info: {
        heading: "Información",
        address: "Cuauhtémoc, 06720, Ciudad de México",
        web: "ierwinx.com",
        languages: "Idiomas",
        langSpanish: "Español - Nativo",
        langEnglish: "Inglés - Intermedio B1"
      },
      social: { heading: "Redes Sociales" },
      skills: {
        heading: "Skills",
        mobile: "Móvil",
        frontend: "Frontend",
        backend: "Backend",
        database: "Bases de Datos",
        architecture: "Patrones Arquitectónicos",
        devops: "DevOps & Cloud"
      },
      testimonial: {
        quote: "Erwin es el tipo de ingeniero que no solo entrega resultados excepcionales, sino que eleva a todo el equipo a su alrededor. Su capacidad para liderar proyectos móviles complejos manteniendo la calidad del código es sobresaliente.",
        role: "Director — Garante / Gpo Proyectos Estrategias Empresariales"
      },
      projects: {
        heading: "Proyectos Destacados",
        list: [
          {
            name: "PagApp",
            role: "Tech Lead & iOS Developer",
            description: "Plataforma de transferencias interbancarias que procesa millones de transacciones diarias. Lideré la arquitectura móvil y entregas.",
            tags: ["Swift", "Kotlin"],
            emoji: "🏦",
            url: "https://pagapp.mx"
          },
          {
            name: "STPCodig",
            role: "Tech Lead & iOS Developer",
            description: "Solución de pagos y cobros a través de CoDi® (BANXICO) que permite a comercios y negocios pagar y cobrar de forma ágil y segura.",
            tags: ["Swift", "Kotlin"],
            emoji: "💸",
            url: "https://stp.mx/app-codig/"
          },
          {
            name: "Super App BAZ",
            role: "Tech Lead & iOS Developer",
            description: "Super app todo-en-uno con pagos, transferencias, streaming de películas, red social y marketplace — atendiendo a millones de usuarios.",
            tags: ["Swift"],
            emoji: "📱",
            url: "https://www.baz.app"
          },
          {
            name: "Banco Azteca",
            role: "iOS Developer Sr",
            description: "App móvil bancaria principal atendiendo a más de 10M de usuarios en Latinoamérica.",
            tags: ["Swift", "Objective-C"],
            emoji: "💳",
            url: "https://www.bancoazteca.com.mx/app/app-banco-azteca.html"
          },
          {
            name: "Encuentro Católico",
            role: "iOS Developer",
            description: "Plataforma social y de comunidad para eventos religiosos y contenido.",
            tags: ["Swift", "Firebase", "MongoDB"],
            emoji: "⛪",
            url: null
          }
        ]
      },
      experience: {
        heading: "Experiencia Laboral",
        jobs: [
          {
            period: "2022 - Actual",
            company: "Sistema De Transferencias y Pagos STP",
            roles: ["Tech Lead", "iOS Developer Sr"],
            description: "Líder técnico para aplicaciones móviles en iOS, Android y Backend. Responsable de tomar decisiones de arquitectura, participar directamente en el desarrollo y alinearme técnicamente con los equipos de negocio y producto para entregar soluciones escalables y que cumplan con las normativas apoyándome de IA como Claude Code."
          },
          {
            period: "2018 - 2022",
            company: "Grupo Salinas / Banco Azteca",
            roles: ["Tech Lead", "Manager", "iOS Developer Sr", "Arquitecto Cloud", "DevOps"],
            description: "Lideré el desarrollo en un equipo para aplicaciones como Banco Azteca, Super App BAZ y Encuentro Católico. Colaboré estrechamente con equipos de diseño, producto y negocio, definiendo hojas de ruta y alineando la ejecución técnica con los objetivos del negocio. Coordiné equipos multidisciplinarios (Back-end, Front-end, QA, UX). Implementé pipelines de CI/CD, arquitecturas en la nube sobre AWS y despliegues contenerizados utilizando Docker, Kubernetes y OpenShift. Desarrollé servicios backend con Node.js y MongoDB."
          },
          {
            period: "2015 - 2018",
            company: "Grupo Proyectos Estrategias Empresariales",
            roles: ["Java Developer Sr", "Java Developer Jr"],
            description: "Diseñé e implementé soluciones backend en Java para sistemas de nómina, asegurando confiabilidad e integridad de datos. Contribuí al desarrollo de una plataforma digital para psicólogos enfocada en servicios backend seguros y escalables."
          },
          {
            period: "2014 - 2015",
            company: "Grupo ID Soft, ISC Control Inteligente",
            roles: ["Android Developer Jr"],
            description: "Implementé sistemas de asistencia basados en geolocalización en Android, enfocado en confiabilidad, precisión y validación eficiente de ubicación para gestión de fuerza laboral."
          },
          {
            period: "2013 - 2014",
            company: "Secretaría de Gobernación",
            roles: ["Android Developer"],
            description: "Participé en el desarrollo en Android de una plataforma de monitoreo de infraestructura a nivel nacional, detectando caídas de enlace y activando alertas a administradores responsables para reducir tiempos de inactividad."
          }
        ]
      },
      education: {
        heading: "Educación",
        degree: {
          period: "2009 - 2013",
          institution: "Tecnológico de Estudios Superiores de Chalco",
          career: "Ingeniero en Sistemas Computacionales",
          specialtyLabel: "Especialidad",
          specialty: "Desarrollo de Sistemas Web"
        },
        certifications: "Cursos",
        certs: [
          { year: "2020", name: "iOS 12 y Swift 4", institution: "Udemy", img: "ios12" },
          { year: "2020", name: "Desarrollo de Apps para iOS", institution: "Platzi", img: "ios-desarrollo" },
          { year: "2020", name: "Desarrollo de interfaces para iOS", institution: "Platzi", img: "ios-diseno" },
          { year: "2020", name: "POO con Swift", institution: "Platzi", img: "swift-poo" },
          { year: "2020", name: "Funciones con Swift", institution: "Platzi", img: "swift-funciones" },
          { year: "2020", name: "Programación en Swift", institution: "Platzi", img: "swift" },
          { year: "2020", name: "Fundamentos de Swift", institution: "Platzi", img: "swift-fundamentos" },
          { year: "2020", name: "Diseño de Interfaces Android", institution: "Platzi", img: "interfaces-android" },
          { year: "2020", name: "Kotlin para Android", institution: "Platzi", img: "kotlin-android" },
          { year: "2020", name: "Bases Técnicas de Android", institution: "Platzi", img: "tecnico-android" },
          { year: "2020", name: "Kotlin", institution: "Platzi", img: "kotlin" },
          { year: "2020", name: "ReactJS", institution: "Udemy", img: "react" },
          { year: "2020", name: "Red Hat OpenShift Development I", institution: "Red Hat", img: "Redhat openshift" },
          { year: "2019", name: "Intro a Contenedores y Kubernetes", institution: "Red Hat", img: "Redhat intro contenedores" },
          { year: "2019", name: "Red Hat System Administration II", institution: "Red Hat", img: "Redhat admin 2" },
          { year: "2019", name: "Red Hat System Administration I", institution: "Red Hat", img: "Redhat admin 1" },
          { year: "2019", name: "Architecting on AWS", institution: "Netec", img: "arquitecto aws" },
          { year: "2019", name: "Programación en GO", institution: "Platzi", img: "go" },
          { year: "2019", name: "Introducción a DevSecOps", institution: "Grupo Salinas", img: "DevSecOps" },
          { year: "2018", name: "Jenkins", institution: "Udemy", img: "jenkins" },
          { year: "2017", name: "Oracle Database 12c: Admin", institution: "IPN ESCOM", img: "Oracle 2" },
          { year: "2017", name: "Oracle Database 12c: SQL & PLSQL", institution: "IPN ESCOM", img: "Oracle 1" },
          { year: "2017", name: "Desarrollo web con Spring 4.3", institution: "Udemy", img: "spring 2" },
          { year: "2015", name: "Java y Spring, Hibernate", institution: "IPN UPIITA", img: "spring" },
          { year: "2014", name: "Front-end con HTML5, jQuery y Git", institution: "IPN UPIITA", img: "html5" }
        ]
      },
      references: {
        heading: "Referencias",
        showBtn: "Mostrar referencias",
        hideBtn: "Ocultar referencias",
        list: [
          { name: "Jesús Fernando Ciriaco", role: "STP Chief Technology", phone: "55 6680 6922" },
          { name: "Jorge Luis Pilo", role: "STP Mobile Apps Manager", phone: "55 7803 8252" },
          { name: "Miguel Hernández", role: "Banco Azteca Chief", phone: "55 30 45 86 15" },
          { name: "Carlos Altamirano", role: "Garante / Gpo Proyectos Estrategias Empresariales Chief", phone: "55 16 33 81 77" },
          { name: "Carlos Ortíz", role: "Banco Azteca Chief", phone: "55 56 18 42 73 93" },
          { name: "Mauricio Serna", role: "ID Soft Chief CEO", phone: "55 24 54 43 60" }
        ]
      },
      contact: {
        heading: "Enviar mensaje",
        name: "Nombre",
        lastName: "Apellido",
        company: "Empresa",
        email: "Email",
        message: "Mensaje",
        send: "Enviar",
        sending: "Enviando información",
        success: "La información se ha enviado correctamente",
        error: "Hubo problemas al enviar la información",
        recaptchaError: "El campo es requerido"
      }
    }
  };

  function detectLang() {
    const saved = localStorage.getItem('lang');
    if (saved) return saved;
    const browserLang = navigator.language || navigator.userLanguage || '';
    return browserLang.startsWith('es') ? 'es' : 'en';
  }

  let currentLang = detectLang();
  let t = TRANSLATIONS[currentLang];

  function setLang(lang) {
    currentLang = lang;
    t = TRANSLATIONS[lang];
    localStorage.setItem('lang', lang);
    applyTranslations();
    renderDynamic();
  }

  function getNestedValue(obj, path) {
    return path.split('.').reduce((o, k) => o && o[k], obj);
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const value = getNestedValue(t, key);
      if (value) el.textContent = value;
    });
    const downloadBtn = document.getElementById('downloadCV');
    if (downloadBtn) downloadBtn.href = t.hero.cvFile;
  }

  function renderDynamic() {
    renderProjects();
    renderExperience();
    renderDegree();
    renderCerts();
    renderReferences();
  }

  function renderProjects() {
    const container = document.getElementById('projectsGrid');
    const projects = t.projects?.list || [];
    container.innerHTML = projects.map((p, i) => {
      const tag = p.url ? 'a' : 'div';
      const attrs = p.url ? `href="${p.url}" target="_blank" rel="noopener"` : '';
      return `
      <${tag} class="project-card" ${attrs}>
        <div class="project-preview project-preview--${i + 1} project-preview--placeholder">
          ${p.emoji}
        </div>
        <div class="project-info">
          <div class="project-name">${p.name}</div>
          <div class="project-role">${p.role}</div>
          <div class="project-desc">${p.description}</div>
          <div class="project-tags">
            ${p.tags.map(tag => `<span class="project-tag">${tag}</span>`).join('')}
          </div>
        </div>
      </${tag}>
    `}).join('');
  }

  function renderExperience() {
    const container = document.getElementById('experienceTimeline');
    const jobs = t.experience?.jobs || [];
    container.innerHTML = jobs.map(job => `
      <div class="timeline-item">
        <div class="timeline-period">${job.period}</div>
        <div>
          <div class="timeline-company">${job.company}</div>
          <div class="timeline-roles">
            ${job.roles.map(r => `<span class="timeline-role">${r}</span>`).join('')}
          </div>
          <p class="timeline-desc">${job.description}</p>
        </div>
      </div>
    `).join('');
  }

  function renderDegree() {
    const container = document.getElementById('degreeContent');
    const d = t.education?.degree;
    if (!d) return;
    container.innerHTML = `
      <div class="degree-institution">${d.institution}</div>
      <div class="degree-career">${d.career}</div>
      <div class="degree-specialty">${d.specialtyLabel}: ${d.specialty}</div>
      <div class="degree-period">${d.period}</div>
    `;
  }

  function renderCerts() {
    const container = document.getElementById('certsGrid');
    const certs = t.education?.certs || [];
    container.innerHTML = certs.map(c => `
      <div class="cert-item" data-img="${c.img}">
        <span class="cert-year">${c.year}</span>
        <div>
          <div class="cert-name">${c.name}</div>
          <div class="cert-inst">${c.institution}</div>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.cert-item').forEach(item => {
      item.addEventListener('click', () => {
        const img = item.getAttribute('data-img');
        const modal = document.getElementById('certModal');
        const body = document.getElementById('certModalBody');
        body.innerHTML = `<img src="img/certificados/${img}.jpg" alt="Certificate">`;
        modal.classList.add('active');
      });
    });
  }

  function renderReferences() {
    const container = document.getElementById('refsContent');
    const refs = t.references?.list || [];
    container.innerHTML = `
      <div class="ref-list">
        ${refs.map(r => `
          <div class="ref-item">
            <div class="ref-name">${r.name}</div>
            <div class="ref-role">${r.role}</div>
            <a class="ref-phone" href="tel:${r.phone.replace(/\s/g, '')}">${r.phone}</a>
          </div>
        `).join('')}
      </div>
    `;
  }

  // Theme
  function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    updateThemeIcon();
  }

  function toggleTheme() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
  }

  function updateThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const icon = document.getElementById('themeIcon');
    if (isDark) {
      icon.innerHTML = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
    } else {
      icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
    }
  }

  // Language toggle
  function toggleLang() {
    setLang(currentLang === 'en' ? 'es' : 'en');
  }

  function initReferences() {}

  // Contact form
  function initContactForm() {
    const form = document.getElementById('contactForm');
    const status = document.getElementById('formStatus');

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      const hasRecaptcha = typeof grecaptcha !== 'undefined';
      const recaptchaResponse = hasRecaptcha ? grecaptcha.getResponse() : 'local';
      if (hasRecaptcha && !recaptchaResponse) {
        document.getElementById('errorRecaptcha').textContent = t.contact.recaptchaError;
        return;
      }
      document.getElementById('errorRecaptcha').textContent = '';

      const data = {
        nombre: form.nombre.value,
        apellido1: form.apellido1.value,
        empresa: form.empresa.value,
        email: form.email.value,
        mensaje: form.mensaje.value,
        'g-recaptcha-response': recaptchaResponse
      };

      form.style.display = 'none';
      status.style.display = 'flex';
      status.className = 'form-status';
      status.innerHTML = '<div class="loader"></div>';

      emailjs.init("user_km4RSsF30l5sCapcs0ucE");
      emailjs.send("service_nqyh7vk", "template_cq9vtfz", data).then(
        () => {
          status.className = 'form-status form-status--success';
          status.textContent = t.contact.success;
          form.reset();
          if (hasRecaptcha) grecaptcha.reset();
          setTimeout(() => {
            status.style.display = 'none';
            form.style.display = 'grid';
          }, 4000);
        },
        () => {
          status.className = 'form-status form-status--error';
          status.textContent = t.contact.error;
          setTimeout(() => {
            status.style.display = 'none';
            form.style.display = 'grid';
          }, 4000);
        }
      );
    });
  }

  // Scroll animations
  function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 80);
        }
      });
    }, { threshold: 0.05 });

    document.querySelectorAll('.card').forEach(card => observer.observe(card));
  }

  // Certificate modal
  function initModal() {
    const modal = document.getElementById('certModal');
    const closeBtn = document.getElementById('certModalClose');

    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') modal.classList.remove('active');
    });
  }

  // Scroll to top
  function initScrollTop() {
    const btn = document.getElementById('scrollTop');
    if (!btn) return;

    window.addEventListener('scroll', () => {
      if (window.scrollY > 400) {
        btn.classList.add('visible');
      } else {
        btn.classList.remove('visible');
      }
    });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Topbar name visibility
  function initTopbarName() {
    const heroTitle = document.querySelector('.hero-title');
    const topbarName = document.getElementById('topbarName');
    if (!heroTitle || !topbarName) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          topbarName.classList.remove('visible');
        } else {
          topbarName.classList.add('visible');
        }
      });
    }, { threshold: 0 });

    observer.observe(heroTitle);
  }

  // Custom cursor
  function initCursor() {
    const cursor = document.getElementById('cursor');
    const trail = document.getElementById('cursorTrail');
    if (!cursor || !trail) return;

    let mouseX = 0, mouseY = 0;
    let trailX = 0, trailY = 0;

    document.addEventListener('mousemove', (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursor.style.left = mouseX + 'px';
      cursor.style.top = mouseY + 'px';
    });

    function animateTrail() {
      trailX += (mouseX - trailX) * 0.15;
      trailY += (mouseY - trailY) * 0.15;
      trail.style.left = trailX + 'px';
      trail.style.top = trailY + 'px';
      requestAnimationFrame(animateTrail);
    }
    animateTrail();

    const hoverables = 'a, button, .cert-item, .project-card, .topbar-btn, .ref-toggle, .social-link, .download-btn, .form-submit';
    document.querySelectorAll(hoverables).forEach(el => {
      el.addEventListener('mouseenter', () => {
        cursor.classList.add('custom-cursor--hover');
        trail.classList.add('custom-cursor--trail--hover');
      });
      el.addEventListener('mouseleave', () => {
        cursor.classList.remove('custom-cursor--hover');
        trail.classList.remove('custom-cursor--trail--hover');
      });
    });
  }

  // Typing effect
  const TITLES = ['Mobile Software Engineer', 'Tech Lead', 'iOS Specialist', 'DevSecOps'];
  let titleIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function typeEffect() {
    const el = document.getElementById('typingText');
    if (!el) return;

    const current = TITLES[titleIndex];

    if (!isDeleting) {
      el.textContent = current.substring(0, charIndex + 1);
      charIndex++;
      if (charIndex === current.length) {
        setTimeout(() => { isDeleting = true; typeEffect(); }, 2000);
        return;
      }
      setTimeout(typeEffect, 80);
    } else {
      el.textContent = current.substring(0, charIndex - 1);
      charIndex--;
      if (charIndex === 0) {
        isDeleting = false;
        titleIndex = (titleIndex + 1) % TITLES.length;
        setTimeout(typeEffect, 500);
        return;
      }
      setTimeout(typeEffect, 40);
    }
  }

  // Init
  function init() {
    initTheme();
    setLang(currentLang);
    initReferences();
    initContactForm();
    initScrollAnimations();
    initModal();

    document.getElementById('langBtn').addEventListener('click', toggleLang);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);

    initScrollTop();
    initTopbarName();
    initCursor();
    setTimeout(typeEffect, 600);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
