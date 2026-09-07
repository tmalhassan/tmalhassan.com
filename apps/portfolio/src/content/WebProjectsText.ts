import type { WebProjects } from "../types/SectionsTypes"
import type { ContentBlock } from "../types/TextBlockContent"
import aluraSec1 from '../assets/pages/web-dev-page/alura/section1.webp';
import hairdaySec1 from '../assets/pages/web-dev-page/hairday/section1.webp';

type ProjectsType = Record<WebProjects, {
  name: string, 
  about: ContentBlock[],
  sections: {
    image: string,
    title: string,
    shortDesc: string,
    fullDesc: ContentBlock[]
  }[]
}>

export const PROJECTS_DATA: ProjectsType = {
  alura: {
    name: 'Alura',
    about: [
      {
        type: 'paragraph',
        content: `Alura began as a ground-up rework of an e-commerce platform built for the Sudanese market, where conventional payment methods weren't readily available. I integrated Bank of Khartoum's Bankak services as a local alternative to cash on delivery. This integration was the starting point of a complete overhaul of the legacy system and a rebuild on new solid grounds.`
      },
    ],
    sections: [
      {
        image: aluraSec1,
        title: `A User Friendly, Responsive Design`,
        shortDesc: `Whether you're traveling or working from your desktop, manage products and orders effortlessly from any device. The admin panel was built to adapt to any screen size — phone, tablet, or laptop — while maintaining a clean layout and consistent performance. You can even switch between light and dark themes at any moment for a personalized experience.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Under the hood, this design relies on modern CSS techniques and responsive layout practices to ensure both visual consistency and maintainability:'
          },
          {
            type: 'ulist',
            content: [
              `~Fluid~ ~&~ ~Adaptive~ ~Layouts:~ \u00A0 Built using flexible units (#vw#, #vh#, #rem#, #%#) instead of fixed pixels, allowing elements to resize naturally across screen widths.`,
              `~Media~ ~Queries:~ \u00A0 Used to fine-tune breakpoints and optimize the layout for different devices.`,
              `~CSS~ ~Grid~ ~&~ ~Flexbox:~ \u00A0 Combined to create complex yet adaptable structures with minimal markup and clean responsiveness.`,
              `~Theming~ ~with~ ~CSS~ ~Variables:~ \u00A0 A global color palette is defined through #:root# variables, enabling instant theme switching and consistent colors across the app.`,
              `~Dark/Light~ ~Mode~ ~Toggle:~ \u00A0 Implemented by dynamically toggling a #data-theme# attribute on the root element... no page reloads required.`
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Product Management & Inventory Control`,
        shortDesc: `Easily manage every aspect of your store's products — from titles and prices to stock levels and images — all in one place. Add, edit, or remove products with confidence, knowing every change is synced across your system in real time. The inventory automatically updates when sales occur, helping you stay organized and avoid overselling.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Designed for scalability and accuracy, the system relies on a clean database structure and efficient update logic to keep product data consistent:'
          },
          {
            type: 'ulist',
            content: [
              `~Relational~ ~Database~ ~Structure:~ \u00A0 Products, stock, and variant tables are linked through foreign keys for clean, modular organization.`,
              `~Smart~ ~Data~ ~Diffing:~ \u00A0 A change-detection system compares the current product-object state with the original data and sends only modified fields, reducing payloads and server processing.`,
              `~Version~ ~Conflict~ ~Detection:~ \u00A0 Prevents admins from overwriting each other's changes by alerting users when data is modified during editing.`
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Security & Performance`,
        shortDesc: `Security and performance were considered throughout the application, from protecting user accounts and sessions to validating every request before it reaches the database. The system is designed to keep sensitive data secure while remaining responsive and efficient.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Multiple layers of protection work together to secure the application:'
          },
          {
            type: 'ulist',
            content: [
              `~Secure~ ~Authentication:~ \u00A0 Passwords are hashed using #bcrypt#, while persistent sessions provide secure user authentication.`,
              `~Session~ ~Security:~ \u00A0 #Express# sessions with a database-backed store maintain authenticated sessions without exposing sensitive credentials to the client.`,
              `~Multi-Layer~ ~Validation:~ \u00A0 Inputs are validated on the client for immediate feedback, then re-validated on the server against expected parameters, formats, data types, and allowed fields.`,
              `~Parameterized~ ~Queries:~ \u00A0 #MySQL# parameterized queries protect database operations against SQL injection.`,
              `~Atomic~ ~Transactions:~ \u00A0 #MySQL# transactions ensure related operations succeed together (#commit#) or fully (#rollback#) on error, preventing inconsistent data.`,
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Optimized Image & Media Management`,
        shortDesc: `Manage product images effortlessly with a simple drag-and-drop interface. Add, remove, replace, or rearrange images with ease, while automatic thumbnail generation keeps browsing fast and responsive — even with image-heavy products.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Built to balance usability with efficient image delivery:'
          },
          {
            type: 'ulist',
            content: [
              `~Automatic~ ~Thumbnails:~ \u00A0 #Sharp# generates optimized thumbnail versions to reduce loading times while browsing.`,
              `~Drag~ ~&~ ~Drop~ ~Management:~ \u00A0 Images can be added, removed, replaced, or reordered through an intuitive interface.`,
              `~Client-Side~ ~Processing:~ \u00A0 Images are pre-processed before upload to reduce unnecessary data transfer.`,
              `~Managed~ ~File~ ~Lifecycle:~ \u00A0 Uploads are kept in memory using #Multer# while processing takes place. Files are written to permanent storage only after the database operation succeeds, with temporary resources cleaned up after completion or failure to prevent orphaned files and unnecessary storage usage.`,
            ]
          },
        ]
      },
    ]
  },
  meshregen: {
    name: 'MeshRegen',
    about: [
      {
        type: 'paragraph',
        content: `While building this project, I wanted a loading animation made from a triangulated version of the website logo. Then, while manually creating the triangles in Illustrator, I had a thought: “How cool would it be if they were different on every reload?”. I couldn't find a tool that could generate similarly sized triangles while still following the exact SVG shape. So naturally, I thought: “How hard could it be?... right?”`
      },
      {
        type: 'paragraph',
        content: `Well... *insert SpongeBob's 2000 years later meme*, and with an unhealthy amount of coffee, MeshRegen was born. What started as a small idea for a logo loading animation became the core of this portfolio website. It is, without a doubt, one of the coolest projects that I've worked on.`
      }
    ],
    sections: [
      {
        image: aluraSec1,
        title: `Procedural SVG Mesh Generation`,
        shortDesc: `Turn any SVG path into a procedural mesh with adjustable point density. Every mesh is generated from scratch, creating a unique triangulation while preserving the overall shape of the original design.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'The mesh generation pipeline combines SVG geometry with Delaunay triangulation to create a flexible foundation for the rest of the algorithm:'
          },
          {
            type: 'ulist',
            content: [
              `~SVG~ ~Path~ ~Extraction:~ \u00A0 Uses the input #pathD# as the source geometry for mesh generation.`,
              `~Procedural~ ~Point~ ~Generation:~ \u00A0 Points are generated dynamically inside the SVG boundaries rather than relying on predefined coordinates.`,
              `~Delaunay~ ~Triangulation:~ \u00A0 #d3-delaunay# connects the generated points into a mesh while avoiding unnecessarily narrow triangles.`,
              `~Adjustable~ ~Density:~ \u00A0 Point spacing can be controlled to produce anything from coarse, lightweight meshes to dense, highly detailed ones.`,
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Controlled Randomness & Point Distribution`,
        shortDesc: `Generate naturally varied meshes without letting random points cluster together. Control the spacing between points to influence the density, size, and overall character of the resulting triangulation.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Randomness is useful for creating unique meshes, but completely unrestricted randomness produces unpredictable and uneven results. MeshRegen uses Poisson-disc sampling to keep the distribution controlled:'
          },
          {
            type: 'ulist',
            content: [
              `~Poisson-Disc~ ~Sampling:~ \u00A0 #poisson-disk-sampling# enforces a minimum distance between generated points, preventing excessive clustering.`,
              `~Adjustable~ ~Point~ ~Spacing:~ \u00A0 The minimum distance can be modified to control how densely points are distributed.`,
              `~Predictable~ ~Variation:~ \u00A0 Each generation produces different points while maintaining a consistent overall distribution.`,
              `~Triangle~ ~Density:~ \u00A0 Smaller point distances create denser meshes, while larger distances produce fewer, larger triangles.`,
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Shape-Aware Triangulation`,
        shortDesc: `Generate meshes that follow the exact shape of the original SVG instead of simply filling it with triangles. How do we ensure the triangles adjust to teh SVG's path? Simply by clipping the triangles. But hold on! It goes far beyond that.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'Clipping thousands of triangles against an SVG path can become a surprisingly expensive operation. MeshRegen uses the idea of two "imaginary" offset boundaries to reduce that workload. One offsets outwards and the other inwards. And every triangle that falls within that area gets clipped!'
          },
          {
            type: 'ulist',
            content: [
              `~Dual~ ~Boundary~ ~Offsets:~ \u00A0 #clipper2-ts# generates configurable inward and outward offsets around the SVG path, creating a ring-shaped test region.`,
              `~Reduced~ ~Workload:~ \u00A0 A mesh containing 2,000 triangles might only require a few hundred to be processed, dramatically reducing the amount of geometry that needs clipping.`,
              `~Shape~ ~Preservation:~ \u00A0 The selected triangles are clipped against the original SVG path, allowing the final mesh to follow the exact boundary and form polygons with more than three vertices where needed.`,
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `Interactive Controls & Performance`,
        shortDesc: `Experiment with mesh generation in real time. Adjust point spacing and boundary offsets, regenerate the mesh instantly, and see how each parameter affects the geometry, triangle count, and performance.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: 'MeshRegen exposes the algorithm through an interactive interface designed to make its behavior easy to explore:'
          },
          {
            type: 'ulist',
            content: [
              `~Live~ ~Parameters:~ \u00A0 Adjust point spacing and boundary offsets without leaving the preview.`,
              `~Instant~ ~Feedback:~ \u00A0 Regenerate the mesh and immediately see how parameter changes affect the result.`,
              `~Visualized~ ~Geometry:~ \u00A0 Inspect the generated points, triangles, and resulting shape while experimenting.`,
              `~Performance~ ~Testing:~ \u00A0 Try different parameter combinations and SVG complexity to see how they affect generation time and mesh density.`,
            ]
          },
        ]
      },
      {
        image: aluraSec1,
        title: `What's Next for MeshRegen?`,
        shortDesc: `MeshRegen is already capable of generating complex shape-aware meshes, but there are plenty of ways I'd like to take it further.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: `Some of the improvements I'd like to explore:`
          },
          {
            type: 'ulist',
            content: [
              `~Smarter~ ~Boundary~ ~Points:~ \u00A0 Improve point placement around sharp edges to reduce unwanted tiny shards near the SVG boundary.`,
              `~Nested~ ~Holes:~ \u00A0 Extend support for deeply nested interior paths, such as a circle inside another circle.`,
              `~More~ ~Export~ ~Options:~ \u00A0 Allow generated meshes to be exported as individual SVGs, making them useful beyond the canvas-based workflow.`,
            ]
          },
        ]
      },
    ]
  },
  hairday: {
    name: 'Hair Day',
    about: [
      {
        type: 'paragraph',
        content: `Hair Day Salon was created as a final assessment for the Meta Front-End Developer course. The goal was simple: design and build a polished landing page for a fictional salon offering hair styling, hair dyeing, makeup, and nail art.`
      },
    ],
    sections: [
      {
        image: hairdaySec1,
        title: `Design & Responsive Layout`,
        shortDesc: `The page was built from scratch using HTML, CSS, and JavaScript, with the main focus on creating a clean and inviting experience that reflects the salon's services.`,
        fullDesc: [
          {
            type: 'paragraph',
            content: ""
          },
          {
            type: 'ulist',
            content: [
              `~Visual~ ~Hierarchy:~ \u00A0 Carefully structured typography, spacing, imagery, and content sections to guide visitors through the page.`,
              `~Responsive~ ~Design:~ \u00A0 Adapted the layout for different screen sizes while keeping the overall visual balance intact.`,
              `~Interactive~ ~Elements:~ \u00A0 Added lightweight JavaScript interactions to make the page feel more dynamic without relying on external frameworks.`,
            ]
          },
        ]
      },
    ]
  },
}





















