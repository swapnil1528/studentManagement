import React from 'react';

export default function AnimatedSkeleton() {
    return (
        <div className="w-full max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
            {/* Header Profile Skeleton */}
            <div className="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="h-16 w-16 bg-gray-200 rounded-full shrink-0"></div>
                <div className="space-y-2 flex-grow">
                    <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/6"></div>
                </div>
            </div>

            {/* Widget Grid Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Large Widget Skeleton */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col justify-between">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-32 w-32 bg-gray-200 rounded-full mx-auto"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto mt-4"></div>
                </div>

                {/* Secondary Widgets Skeletons */}
                <div className="space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-28">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-28">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded w-4/6"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
