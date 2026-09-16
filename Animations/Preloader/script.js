document.addEventListener("DOMContentLoaded", () => {
  const words = ["Hello", "Bonjour", "Ciao", "Olá", "やあ", "Hallå", "Guten tag", "Hallo"];
  const preloader = document.getElementById("js-preloader");
  const wordText = document.getElementById("js-word-text");
  const wordEl = document.getElementById("js-word");
  const path = document.getElementById("js-path");
  const pageContent = document.querySelector(".page__content");

  const dimension = {
    width: window.innerWidth,
    height: window.innerHeight
  };

  function getPaths() {
    const initialPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height + 300} 0 ${dimension.height} L0 0`;
    const targetPath = `M0 0 L${dimension.width} 0 L${dimension.width} ${dimension.height} Q${dimension.width / 2} ${dimension.height} 0 ${dimension.height} L0 0`;
    return { initialPath, targetPath };
  }

  function setInitialPath() {
    const { initialPath } = getPaths();
    path.setAttribute("d", initialPath);
  }

  setInitialPath();

  let index = 0;
  wordText.textContent = words[index];

  gsap.to(wordEl, {
    opacity: 0.75,
    duration: 1,
    delay: 0.2
  });

  function cycleWords() {
    if (index === words.length - 1) return;

    const delay = index === 0 ? 1 : 0.15;

    gsap.delayedCall(delay, () => {
      index += 1;
      wordText.textContent = words[index];
      cycleWords();
    });
  }

  cycleWords();

  const totalDelay = words.length * 0.15 + 1.5;

  gsap.delayedCall(totalDelay, () => {
    const { initialPath, targetPath } = getPaths();

    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        preloader.style.display = "none";

        gsap.to(pageContent, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out"
        });

        document.body.style.overflow = "";
      }
    });

    tl.to(wordEl, {
      opacity: 0,
      duration: 0.3
    }, 0);

    tl.to(preloader, {
      y: "-100vh",
      duration: 0.8,
      delay: 0.2,
      ease: "power4.inOut"
    }, 0);

    tl.fromTo(path, {
      attr: { d: initialPath }
    }, {
      attr: { d: targetPath },
      duration: 0.7,
      delay: 0.3,
      ease: "power4.inOut"
    }, 0);
  });

  window.addEventListener("resize", () => {
    dimension.width = window.innerWidth;
    dimension.height = window.innerHeight;
    setInitialPath();
  });
});
