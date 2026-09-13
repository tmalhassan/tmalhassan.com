import type { Project } from "../types/SectionsTypes";

type RedirectLinkTargets = Project | 'linkedin' | 'email' | '';

export function handleRedirectButtonClick(target: RedirectLinkTargets) {
  // Open a specific URL in a new tab
  let link = '';

  switch (target) {
    case 'alura':
      link = 'https://tmalhassan.com/alura/';
      break;

    case 'meshregen':
      link = 'https://tmalhassan.com/meshregen/';
      break;

    case 'hairday':
      link = 'https://tmalhassan.com/hairday/';
      break;

    case 'starleap':
      link = 'https://tmalhassan.com/';  // starleap
      break;

    case 'email':
      link = 'mailto:tarekmalhassan@gmail.com';
      break;

    case 'linkedin':
      link = 'https://www.linkedin.com/in/tmalhassan/';
      break;
  
    default:
      link = 'https://tmalhassan.com/'
      break;
  }

  window.open(link, '_blank', 'noopener,noreferrer');
};