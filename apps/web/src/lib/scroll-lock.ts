let locks = 0;
let saved = { overflow: "", paddingRight: "" };

/** Блокирует прокрутку страницы, компенсируя ширину полосы прокрутки, чтобы контент не прыгал. */
export function lockScroll(): () => void {
  const body = document.body;
  if (locks === 0) {
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
    body.style.overflow = "hidden";
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  }
  locks += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    locks -= 1;
    if (locks === 0) {
      body.style.overflow = saved.overflow;
      body.style.paddingRight = saved.paddingRight;
    }
  };
}
