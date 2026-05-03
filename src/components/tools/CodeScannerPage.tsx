import { useState, useEffect, useRef } from "react"
import { Html5Qrcode } from "html5-qrcode"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Copy, RefreshCw, Camera, ScanLine, X, Upload, Image as ImageIcon } from "lucide-react"
import { ResultCard } from "@/components/shared/ResultCard"
import { cn } from "@/lib/utils"

export function CodeScannerPage() {
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Handle camera scanning
  useEffect(() => {
    if (isScanning && !scannerRef.current) {
      const html5QrCode = new Html5Qrcode("reader")
      const config = { fps: 10, qrbox: { width: 250, height: 250 } }

      html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          setScanResult(decodedText)
          stopScanning()
          toast.success("Code scanned successfully!")
        },
        (_errorMessage) => {
          // ignore failures
        }
      ).catch((err) => {
        console.error("Camera start error", err)
        toast.error("Could not access camera. Please check permissions.")
        setIsScanning(false)
      })

      scannerRef.current = html5QrCode
    }

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Stop error", err))
      }
    }
  }, [isScanning])

  // Handle global paste event
  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const items = event.clipboardData?.items
      if (!items) return

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const file = items[i].getAsFile()
          if (file) {
            processFile(file)
            break
          }
        }
      }
    }

    window.addEventListener("paste", handlePaste)
    return () => window.removeEventListener("paste", handlePaste)
  }, [])

  const startScanning = () => {
    setScanResult(null)
    setIsScanning(true)
  }

  const stopScanning = () => {
    if (scannerRef.current) {
      if (scannerRef.current.isScanning) {
        scannerRef.current.stop().then(() => {
          setIsScanning(false)
          scannerRef.current = null
        }).catch(err => console.error("Stop error", err))
      } else {
        setIsScanning(false)
        scannerRef.current = null
      }
    } else {
      setIsScanning(false)
    }
  }

  const processFile = async (file: File) => {
    const html5QrCode = new Html5Qrcode("file-processor")
    try {
      toast.info("Processing image...")
      const decodedText = await html5QrCode.scanFile(file, true)
      setScanResult(decodedText)
      toast.success("Code found in image!")
    } catch (err) {
      console.error("File scan error", err)
      toast.error("No valid QR code or barcode found in this image.")
    } finally {
      html5QrCode.clear()
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      processFile(file)
    } else {
      toast.error("Please drop a valid image file.")
    }
  }

  const copyToClipboard = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult)
      toast.success("Result copied to clipboard")
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Code Scanner</h1>
        <p className="text-muted-foreground mt-2">Scan QR codes and barcodes using your camera, image files, or by pasting.</p>
      </div>

      {/* Hidden container for file processing */}
      <div id="file-processor" className="hidden"></div>

      {!isScanning && !scanResult && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Camera Card */}
          <Card 
            className="p-8 flex flex-col items-center justify-center border-dashed bg-muted/20 cursor-pointer hover:bg-muted/30 transition-colors"
            onClick={startScanning}
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Camera className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-1">Use Camera</h3>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Scan codes in real-time using your webcam.
            </p>
            <Button variant="outline" className="gap-2 pointer-events-none">
              <ScanLine className="h-4 w-4" /> Start Scanner
            </Button>
          </Card>

          {/* Upload/Paste Card */}
          <Card 
            className={cn(
              "p-8 flex flex-col items-center justify-center border-dashed transition-all border-2",
              isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "bg-muted/20 border-muted-foreground/20"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className={cn("h-8 w-8 text-primary", isDragging && "animate-bounce")} />
            </div>
            <h3 className="text-lg font-semibold mb-1">Upload or Paste</h3>
            <p className="text-muted-foreground text-sm text-center mb-6">
              Drag & drop an image, paste (Ctrl+V), or click to upload.
            </p>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange} 
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-2">
              <ImageIcon className="h-4 w-4" /> Select Image
            </Button>
          </Card>
        </div>
      )}

      {isScanning && (
        <div className="space-y-4">
          <Card className="overflow-hidden relative bg-black aspect-square max-w-md mx-auto rounded-xl border-4 border-primary/20 shadow-2xl">
            <div id="reader" className="w-full h-full"></div>
            <div className="absolute top-4 right-4 z-10">
              <Button size="icon" variant="destructive" onClick={stopScanning}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            {/* Visual scan line effect */}
            <div className="absolute inset-0 pointer-events-none border-t-2 border-primary/50 animate-[scan_2s_linear_infinite] z-0"></div>
          </Card>
          <p className="text-center text-sm text-muted-foreground animate-pulse">
            Position the code within the scanner box...
          </p>
          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={stopScanning}>Cancel Scanning</Button>
          </div>
        </div>
      )}

      {scanResult && (
        <ResultCard
          title="Scan Result"
          status="success"
          description="Code successfully decoded"
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setScanResult(null); setIsScanning(false); }} className="gap-1">
                <RefreshCw className="h-3.5 w-3.5" /> New Scan
              </Button>
              <Button size="sm" onClick={copyToClipboard} className="gap-1">
                <Copy className="h-3.5 w-3.5" /> Copy
              </Button>
            </div>
          }
        >
          <div className="p-4 bg-muted rounded-lg border font-mono break-all text-lg">
            {scanResult}
          </div>
          
          {scanResult.startsWith('http') && (
            <div className="mt-4">
              <Button asChild variant="link" className="px-0">
                <a href={scanResult} target="_blank" rel="noreferrer">Open Link &rarr;</a>
              </Button>
            </div>
          )}
        </ResultCard>
      )}

      <div className="bg-muted/40 p-4 rounded-lg border text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold text-foreground mb-1">Supported Formats</h4>
          <p>QR Codes, Barcodes (EAN-13, Code-128, UPC-A, ITF), Data Matrix.</p>
        </div>
        <div>
          <h4 className="font-semibold text-foreground mb-1">Privacy First</h4>
          <p>Processing happens locally in your browser. No images are uploaded to any server.</p>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan {
          0% { transform: translateY(0); }
          50% { transform: translateY(100%); }
          100% { transform: translateY(0); }
        }
      `}} />
    </div>
  )
}
