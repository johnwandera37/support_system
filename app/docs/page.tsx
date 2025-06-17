// Swagger UI React Page (Client-side)

"use client";
import dynamic from "next/dynamic";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function SwaggerDocs() {
  return (
    <div style={{ height: "100vh" }}>
      <SwaggerUI url="/api/swagger-json" />
    </div>
  );
}

// "use client";
// import dynamic from "next/dynamic";
// import "swagger-ui-react/swagger-ui.css";

// const SwaggerUI = dynamic(
//   () => import("swagger-ui-react"), 
//   { ssr: false }
// );

// export default function SwaggerDocs() {
//   return (
//     <div style={{ height: "100vh" }}>
//       <SwaggerUI url="/api/swagger-json" />
//     </div>
//   );
// }

// "use client";
// import { log } from "@/utils/logger";
// import dynamic from "next/dynamic";
// import { useEffect, useState } from "react";
// import "swagger-ui-react/swagger-ui.css";

// // Custom loader component
// const Loader = () => (
//   <div style={{
//     display: 'flex',
//     justifyContent: 'center',
//     alignItems: 'center',
//     height: '100vh',
//     backgroundColor: '#f5f5f5'
//   }}>
//     <div style={{
//       textAlign: 'center',
//       padding: '2rem',
//       background: 'white',
//       borderRadius: '8px',
//       boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
//     }}>
//       <h3>Loading API Documentation...</h3>
//       <p>Please wait while we load the Swagger UI</p>
//     </div>
//   </div>
// );

// export default function SwaggerDocs() {
//   const [mounted, setMounted] = useState(false);
  
//   // Dynamically import SwaggerUI with no SSR
//   const SwaggerUI = dynamic(
//     () => import("swagger-ui-react").then(mod => {
//       // Workaround for React lifecycle warnings
//       const Swagger = mod.default;
//       return function SafeSwaggerUI(props: any) {
//         useEffect(() => {
//           // This helps prevent some of the lifecycle warnings
//           log('Swagger UI mounted');
//         }, []);
//         return <Swagger {...props} />;
//       };
//     }),
//     { 
//       ssr: false,
//       loading: () => <Loader />
//     }
//   );

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   if (!mounted) {
//     return <Loader />;
//   }

//   return (
//     <div style={{ 
//       height: "100vh",
//       // overflow: 'hidden'
//     }}>
//       <SwaggerUI 
//         url="/api/swagger-json"
//         docExpansion="none" // Start with all operations collapsed
//         defaultModelsExpandDepth={-1} // Hide schemas by default
//         displayOperationId={false}
//         filter={true} // Enable search/filter
//       />
//     </div>
//   );
// }

