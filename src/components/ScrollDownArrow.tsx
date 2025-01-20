import React, { useEffect, useState } from "react";
import { FaAngleDown } from "react-icons/fa";

interface ScrollDownArrowProps {
  color?: string; // Couleur personnalisée (par exemple : 'red-500', 'green-600')
}

const ScrollDownArrow: React.FC<ScrollDownArrowProps> = ({
  color = "blue-600",
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsVisible(false);
      } else {
        setIsVisible(true);
      }
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const handleClick = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
  };

  return (
    <div
      className={`fixed bottom-6 left-1/2 transform -translate-x-1/2 transition-opacity duration-500 z-50 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* Outer Circle */}
      <div
        onClick={handleClick}
        className="relative w-24 h-24 animate-fadeInDown cursor-pointer"
      >
        <div
          className={`absolute w-24 h-24 bg-${color} opacity-50 rounded-full animate-zoomIn`}
        ></div>

        {/* Inner Circle */}
        <div
          className={`absolute top-5 left-5 w-14 h-14 bg-${color} rounded-full z-10 flex items-center justify-center`}
        >
          <div className="absolute w-12 h-12 border-2 border-teal-800 rounded-full"></div>
          <FaAngleDown className="text-white text-3xl" />
        </div>
      </div>
    </div>
  );
};

export default ScrollDownArrow;
