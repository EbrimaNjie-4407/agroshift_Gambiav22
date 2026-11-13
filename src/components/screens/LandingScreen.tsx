/**
 * AgroShift Gambia — Screen 1: Landing Page
 * Faithful to Figma Page 1:
 * - Header with HOME (active), MY FARM, ABOUT US, FEATURES, HOW IT WORKS
 * - Left column: "AgroShift Gambia. Make smarter crop rotation decisions with NASA data."
 * - Buttons: "Analyze my Farm" and "▷ See an example field"
 * - Right column: 4 tilted rounded image cards of smiling Gambian farmers and green fields
 * - Bottom banner: NASA, Crop rotation, Local soil, Built for farmers
 */

import React from 'react';
import { useAgroShift } from '../../context/AgroShiftContext';
import { Satellite, Sprout, BarChart3, ShieldCheck, Play } from 'lucide-react';

export const LandingScreen: React.FC = () => {
  const { goToStep, runEvaluation } = useAgroShift();

  const handleSeeExample = () => {
    // Navigate straight to field selection with preselected Brikama Manduar pilot field
    goToStep('choose-field');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col justify-between">
      {/* Hero Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12 w-full flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Hero Text Column */}
          <div className="lg:col-span-6 space-y-6">
            <div className="inline-block">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 leading-[1.15]">
                <span className="text-green-800">AgroShift</span> Gambia.
              </h1>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 leading-[1.15]">
              Make <span className="text-amber-600">smarter</span> crop rotation decisions with NASA data.
            </h2>

            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Explore environmental conditions around your farm and compare crop rotation strategies designed for your field.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-4 pt-2">
              <button
                onClick={() => goToStep('choose-field')}
                className="px-6 py-3.5 bg-green-800 hover:bg-green-900 text-white font-semibold rounded-lg text-base shadow-sm transition transform active:scale-95 cursor-pointer"
              >
                Analyze my Farm
              </button>

              <button
                onClick={handleSeeExample}
                className="px-6 py-3.5 bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 font-semibold rounded-lg text-base shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 text-gray-600 fill-gray-600" />
                <span>See an example field</span>
              </button>
            </div>
          </div>

          {/* Right Image Collage (Figma Page 1 layout) */}
          <div className="lg:col-span-6 flex justify-center">
            <div className="grid grid-cols-2 gap-4 sm:gap-6 max-w-lg w-full">
              {/* Image 1: Farmer holding phone */}
              <div className="overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-gray-50 transform -rotate-2 hover:rotate-0 transition duration-300">
                <img
                  src="/assets/aistudio/image_of_an_african_farmer_holding_a_smart_phone_and_smiling_b3f5391c.jpg"
                  alt="Smiling Gambian farmer holding smartphone"
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </div>

              {/* Image 2: Happy farmer with groundnut crop */}
              <div className="overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-gray-50 transform rotate-2 hover:rotate-0 transition duration-300 mt-4">
                <img
                  src="/assets/aistudio/happy_farmer_8ceaf821.webp"
                  alt="Gambian farmer inspecting healthy green crop"
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </div>

              {/* Image 3: Aerial view of cultivated fields */}
              <div className="overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-gray-50 transform rotate-1 hover:rotate-0 transition duration-300">
                <img
                  src="/assets/aistudio/cultivating_b40d0c70.webp"
                  alt="Aerial view of rain-fed fields in The Gambia"
                  className="w-full h-48 sm:h-56 object-cover"
                />
              </div>

              {/* Image 4: Farmers tending green crops */}
              <div className="overflow-hidden rounded-2xl shadow-md border border-gray-100 bg-green-50 transform -rotate-3 hover:rotate-0 transition duration-300 -mt-2">
                <img
                  src="/assets/aistudio/happy_farmer_8ceaf821.webp"
                  alt="Women agricultural farmers in The Gambia"
                  className="w-full h-48 sm:h-56 object-cover saturate-125"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Feature Summary Bar (Matching Figma P1 bottom banner) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
        <div className="bg-[#f0f7f2] border border-[#d6ebd9] rounded-2xl py-5 px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center text-green-800 shrink-0 shadow-xs">
              <Satellite className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">NASA</p>
              <p className="text-xs text-gray-600">Earth observations</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 border-l border-green-200/60 pl-4 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center text-green-800 shrink-0 shadow-xs">
              <Sprout className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Crop rotation</p>
              <p className="text-xs text-gray-600">Guidance</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 border-l border-green-200/60 pl-4 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center text-green-800 shrink-0 shadow-xs">
              <BarChart3 className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Local soil</p>
              <p className="text-xs text-gray-600">Information</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 border-l border-green-200/60 pl-4 md:pl-6">
            <div className="w-10 h-10 rounded-xl bg-white border border-green-200 flex items-center justify-center text-green-800 shrink-0 shadow-xs">
              <ShieldCheck className="w-5 h-5 text-green-700" />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Built for</p>
              <p className="text-xs text-gray-600">Farmers</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
