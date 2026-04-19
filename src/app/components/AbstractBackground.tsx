export function AbstractBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <svg 
        className="absolute inset-0 w-full h-full" 
        viewBox="0 0 1440 900" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Coral/Salmon Pink Base */}
        <rect width="1440" height="900" fill="#FFA58F" />
        
        {/* Turquoise Circle - Top Left */}
        <circle 
          cx="200" 
          cy="200" 
          r="400" 
          fill="#4DD5D6"
        />
        
        {/* Yellow Circle - Top Right */}
        <circle 
          cx="1100" 
          cy="200" 
          r="350" 
          fill="#F7E78A"
        />
        
        {/* Sage Green Circle - Bottom Center */}
        <circle 
          cx="450" 
          cy="700" 
          r="300" 
          fill="#A8C9B4"
        />
        
        {/* Additional organic shapes for depth */}
        <ellipse 
          cx="900" 
          cy="650" 
          rx="280" 
          ry="200" 
          fill="#FFB8A3"
          opacity="0.6"
        />
        
        <ellipse 
          cx="1200" 
          cy="500" 
          rx="200" 
          ry="250" 
          fill="#F9EDA0"
          opacity="0.5"
        />
      </svg>
    </div>
  );
}
