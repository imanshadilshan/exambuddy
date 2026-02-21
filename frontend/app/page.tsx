import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen animated-gradient animate-gradient relative overflow-hidden">
      {/* Floating Shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
      <div className="absolute top-40 right-10 w-72 h-72 bg-yellow-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        <div className="max-w-6xl w-full">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in-up">
            <div className="inline-block mb-6">
              <span className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white text-sm font-semibold border border-white/30">
                🎓 Sri Lanka's Leading Exam Platform
              </span>
            </div>
            
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-black text-white mb-6 leading-tight">
              Welcome to<br />
              <span className="relative inline-block">
                <span className="relative z-10">ExamBuddy</span>
                <span className="absolute bottom-2 left-0 w-full h-4 bg-white/30 -z-10"></span>
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-3xl mx-auto leading-relaxed">
              Master O/L and A/L exams with interactive MCQ papers, real-time rankings, and personalized analytics. Your path to academic excellence starts here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
              <Link
                href="/register"
                className="group px-10 py-5 bg-white text-purple-700 rounded-2xl font-bold text-lg hover:bg-opacity-90 transition-all duration-300 shadow-2xl hover:scale-105 hover:shadow-3xl"
              >
                <span className="flex items-center justify-center gap-2">
                  Get Started Free
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>
              
              <Link
                href="/login"
                className="px-10 py-5 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-2xl font-bold text-lg hover:bg-white/20 transition-all duration-300 shadow-xl hover:scale-105"
              >
                Sign In
              </Link>
            </div>

            <div className="flex items-center justify-center gap-8 text-white/80 text-sm">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                </svg>
                <span>10,000+ Students</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>4.9 Rating</span>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            <div className="glass border border-white/30 rounded-3xl p-8 hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                📚
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">1000+ Practice Papers</h3>
              <p className="text-gray-700 leading-relaxed">
                Access comprehensive MCQ papers covering all subjects for O/L and A/L grades with detailed explanations
              </p>
            </div>
            
            <div className="glass border border-white/30 rounded-3xl p-8 hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                🏆
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Live Rankings</h3>
              <p className="text-gray-700 leading-relaxed">
                Compete with peers island-wide and in your district. Track your position and climb the leaderboard
              </p>
            </div>
            
            <div className="glass border border-white/30 rounded-3xl p-8 hover-lift cursor-pointer group">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl flex items-center justify-center text-3xl mb-6 group-hover:scale-110 transition-transform">
                📊
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Smart Analytics</h3>
              <p className="text-gray-700 leading-relaxed">
                Get personalized insights, identify weak areas, and track your improvement with detailed performance reports
              </p>
            </div>
          </div>

          {/* Stats Section */}
          <div className="glass border border-white/30 rounded-3xl p-12 mb-16">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="text-4xl font-black text-purple-700 mb-2">10K+</div>
                <div className="text-gray-700 font-semibold">Active Students</div>
              </div>
              <div>
                <div className="text-4xl font-black text-purple-700 mb-2">1000+</div>
                <div className="text-gray-700 font-semibold">Practice Papers</div>
              </div>
              <div>
                <div className="text-4xl font-black text-purple-700 mb-2">50K+</div>
                <div className="text-gray-700 font-semibold">Questions</div>
              </div>
              <div>
                <div className="text-4xl font-black text-purple-700 mb-2">25</div>
                <div className="text-gray-700 font-semibold">Districts</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-white/70 text-sm">
            <p>© 2026 ExamBuddy. Empowering Sri Lankan students to achieve excellence.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
