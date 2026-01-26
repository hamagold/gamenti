import FlappyPlaneGame from "@/features/flappy-plane/FlappyPlaneGame";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <FlappyPlaneGame />
        <footer className="mt-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} پەیمانگای تەکنیکی نیشتمانی
        </footer>
      </div>
    </main>
  );
};

export default Index;
