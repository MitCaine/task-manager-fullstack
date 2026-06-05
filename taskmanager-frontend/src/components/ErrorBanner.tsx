type ErrorBannerProps = {
  message: string;
  onDismiss: () => void;
};

function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="error-banner">
      <span>{message}</span>
      <button className="error-banner__close" onClick={onDismiss} aria-label="Dismiss error">✕</button>
    </div>
  );
}

export default ErrorBanner;
