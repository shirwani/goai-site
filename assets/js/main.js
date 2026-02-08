(function () {
  const yearEls = document.querySelectorAll('[data-current-year]');
  const y = new Date().getFullYear();
  yearEls.forEach(el => el.textContent = String(y));

  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const name = (form.querySelector('[name=name]')?.value || '').trim();
      const email = (form.querySelector('[name=email]')?.value || '').trim();
      const budget = (form.querySelector('[name=budget]')?.value || '').trim();
      const description = (form.querySelector('[name=description]')?.value || '').trim();

      const subject = encodeURIComponent('Website inquiry');
      const body = encodeURIComponent(
        `Name: ${name}
Email: ${email}
Your Budget: ${budget}

Description:
${description}`
      );

      window.location.href = `mailto:contact@goaimarketingservices.com?subject=${subject}&body=${body}`;
    });
  }
})();
