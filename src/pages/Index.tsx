import FlappyPlaneGame from "@/features/flappy-plane/FlappyPlaneGame";
import GameFooter from "@/features/flappy-plane/GameFooter";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <FlappyPlaneGame />
        <GameFooter instituteName="پەیمانگای تەکنیکی نیشتمانی" />
      </div>
    </main>
  );
};

export default Index;
