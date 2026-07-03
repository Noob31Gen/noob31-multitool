import { useState, useRef, useEffect, useCallback } from "react"
import { SEO } from "@/components/shared/SEO"
import QRCode from "qrcode"
import JsBarcode from "jsbarcode"
import { safeStorage } from "@/lib/storage"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Download, Copy, Check, QrCode as QrIcon, Barcode as BarIcon, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Checkbox } from "@/components/ui/checkbox"
import { Play } from "lucide-react"
export function CodeGeneratorPage() {
  const [activeTab, setActiveTab] = useState<string>("qr")
  const [text, setText] = useState<string>("")
  const [isCopied, setIsCopied] = useState(false)
  const [isHighResAllowed, setIsHighResAllowed] = useState<boolean>(() => {
    return safeStorage.getItem("qr-allow-high-res") === "true"
  })
  const [isGenerationPaused, setIsGenerationPaused] = useState<boolean>(() => {
    const stored = safeStorage.getItem("qr-pause-gen")
    if (stored !== null) return stored === "true"
    return safeStorage.getItem("qr-allow-high-res") === "true"
  })
  const [qrSize, setQrSize] = useState<number>(() => {
    const stored = parseInt(safeStorage.getItem("qr-size") || "500")
    if (safeStorage.getItem("qr-allow-high-res") !== "true" && stored >= 1000) return 500
    return stored
  })
  const [qrLevel, setQrLevel] = useState<"L" | "M" | "Q" | "H">(() => {
    return (safeStorage.getItem("qr-level") as "L" | "M" | "Q" | "H") || "M"
  })
  const [qrMargin, setQrMargin] = useState<number>(() => {
    return parseInt(safeStorage.getItem("qr-margin") || "2")
  })
  const qrCanvasRef = useRef<HTMLCanvasElement>(null)
  const [barcodeFormat, setBarcodeFormat] = useState<string>(() => {
    return safeStorage.getItem("barcode-format") || "CODE128"
  })
  const [barcodeWidth, setBarcodeWidth] = useState<number>(() => {
    return parseInt(safeStorage.getItem("barcode-width") || "2")
  })
  const [barcodeHeight, setBarcodeHeight] = useState<number>(() => {
    return parseInt(safeStorage.getItem("barcode-height") || "100")
  })
  const barcodeSvgRef = useRef<SVGSVGElement>(null)
  const generateQRCode = useCallback(() => {
    if (activeTab === "qr" && qrCanvasRef.current && text) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        text,
        {
          width: qrSize,
          margin: qrMargin,
          errorCorrectionLevel: qrLevel,
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) {
            console.error(error)
            toast.error("Failed to generate QR code")
          }
        }
      )
    }
  }, [activeTab, text, qrSize, qrMargin, qrLevel]);
  useEffect(() => {
    if (!isGenerationPaused) {
      generateQRCode()
    }
  }, [isGenerationPaused, generateQRCode])

  useEffect(() => {
    if (activeTab === "barcode" && barcodeSvgRef.current && text) {
      try {
        JsBarcode(barcodeSvgRef.current, text, {
          format: barcodeFormat,
          width: barcodeWidth,
          height: barcodeHeight,
          displayValue: true,
          background: "#ffffff",
          lineColor: "#000000",
          margin: 10,
        })
      } catch (error) {
        console.error(error)
      }
    }
  }, [text, barcodeFormat, barcodeWidth, barcodeHeight, activeTab])
  useEffect(() => {
    safeStorage.setItem("qr-allow-high-res", isHighResAllowed.toString())
    safeStorage.setItem("qr-pause-gen", isGenerationPaused.toString())
    safeStorage.setItem("qr-size", qrSize.toString())
    safeStorage.setItem("qr-level", qrLevel)
    safeStorage.setItem("qr-margin", qrMargin.toString())
    safeStorage.setItem("barcode-format", barcodeFormat)
    safeStorage.setItem("barcode-width", barcodeWidth.toString())
    safeStorage.setItem("barcode-height", barcodeHeight.toString())
  }, [isHighResAllowed, isGenerationPaused, qrSize, qrLevel, qrMargin, barcodeFormat, barcodeWidth, barcodeHeight])
  const downloadCode = () => {
    if (activeTab === "qr" && qrCanvasRef.current) {
      const url = qrCanvasRef.current.toDataURL("image/png")
      const link = document.createElement("a")
      link.href = url
      link.download = `qrcode-${Date.now()}.png`
      link.click()
      toast.success("QR Code downloaded")
    } else if (activeTab === "barcode" && barcodeSvgRef.current) {
      const svgData = new XMLSerializer().serializeToString(barcodeSvgRef.current)
      const canvas = document.createElement("canvas")
      const svgSize = barcodeSvgRef.current.getBBox()
      canvas.width = svgSize.width + 20
      canvas.height = svgSize.height + 20
      const ctx = canvas.getContext("2d")
      const img = new Image()
      img.onload = () => {
        if (ctx) {
          ctx.fillStyle = "white"
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          ctx.drawImage(img, 10, 10)
          const url = canvas.toDataURL("image/png")
          const link = document.createElement("a")
          link.href = url
          link.download = `barcode-${Date.now()}.png`
          link.click()
          toast.success("Barcode downloaded")
        }
      }
      img.src = "data:image/svg+xml;base64," + btoa(svgData)
    }
  }
  const copyImage = async () => {
    let canvas: HTMLCanvasElement | null = null;
    if (activeTab === "qr" && qrCanvasRef.current) {
      canvas = qrCanvasRef.current;
    } else if (activeTab === "barcode" && barcodeSvgRef.current) {
      const svgData = new XMLSerializer().serializeToString(barcodeSvgRef.current);
      const svgSize = barcodeSvgRef.current.getBBox();
      canvas = document.createElement("canvas");
      canvas.width = svgSize.width + 20;
      canvas.height = svgSize.height + 20;
      const ctx = canvas.getContext("2d");
      const img = new Image();
      await new Promise((resolve) => {
        img.onload = () => {
          if (ctx) {
            ctx.fillStyle = "white";
            ctx.fillRect(0, 0, canvas!.width, canvas!.height);
            ctx.drawImage(img, 10, 10);
          }
          resolve(null);
        };
        img.src = "data:image/svg+xml;base64," + btoa(svgData);
      });
    }
    if (canvas) {
      canvas.toBlob(async (blob) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              }),
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
            toast.success("Image copied to clipboard");
          } catch (error) {
            console.error("Copy error", error);
            toast.error("Failed to copy image. Your browser might not support this feature.");
          }
        }
      });
    }
  };
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <SEO
        title="QR & Barcode Generator"
        description="Create high-resolution QR codes and barcodes (CODE128, EAN-13, UPC) for URLs, text, or data with customizable settings."
        url="https://tools.noob31.com/bonus/code-generator"
      />
      <div>
        <h1 className="font-brand text-2xl sm:text-3xl font-bold tracking-tight">Code Generator</h1>
        <p className="text-muted-foreground mt-2">Generate QR codes and barcodes for URLs, text, or data.</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-6 space-y-6 rounded-2xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 p-1 bg-muted/50">
              <TabsTrigger value="qr" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <QrIcon className="h-4 w-4" /> QR Code
              </TabsTrigger>
              <TabsTrigger value="barcode" className="flex items-center gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm transition-all">
                <BarIcon className="h-4 w-4" /> Barcode
              </TabsTrigger>
            </TabsList>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code-text">Data to encode</Label>
                <Textarea
                  id="code-text"
                  placeholder={activeTab === "qr" ? "Enter URL or text..." : "Enter numbers or text..."}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="bg-background min-h-[120px] resize-none rounded-xl"
                />
              </div>
              {activeTab === "qr" && (
                <div className="flex flex-col gap-4 p-3 rounded-md bg-muted/50 border border-muted-foreground/10">
                  <div className="flex items-start gap-3">
                    <div className="pt-0.5">
                      <Checkbox
                        id="high-res-allow"
                        checked={isHighResAllowed}
                        onCheckedChange={(checked) => {
                          const val = !!checked;
                          setIsHighResAllowed(val);
                          if (!val && qrSize >= 1000) {
                            setQrSize(500);
                          }
                        }}
                      />
                    </div>
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor="high-res-allow"
                        className="text-sm font-medium leading-none cursor-pointer flex items-center gap-1.5"
                      >
                        Enable high-resolution options <AlertCircle className="h-3 w-3 text-muted-foreground" />
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Warning: All processing happens locally so generating images 1000px or larger can slow down or freeze your browser.
                      </p>
                    </div>
                  </div>
                  {isHighResAllowed && (
                    <div className="flex items-start gap-3 pt-2 border-t border-muted-foreground/10">
                      <div className="pt-0.5">
                        <Checkbox
                          id="pause-gen"
                          checked={isGenerationPaused}
                          onCheckedChange={(checked) => setIsGenerationPaused(!!checked)}
                        />
                      </div>
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor="pause-gen"
                          className="text-sm font-medium leading-none cursor-pointer"
                        >
                          Pause generation
                        </label>
                        <p className="text-xs text-muted-foreground">
                          Pausing real-time generation with high resolution should be enabled to not crash your browser. Disabling this is not recommended.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {activeTab === "qr" && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Error Correction</Label>
                    <Select value={qrLevel} onValueChange={(val: "L" | "M" | "Q" | "H") => setQrLevel(val)}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="L">Low (7%)</SelectItem>
                        <SelectItem value="M">Medium (15%)</SelectItem>
                        <SelectItem value="Q">Quartile (25%)</SelectItem>
                        <SelectItem value="H">High (30%)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Size (px)</Label>
                    <Select value={qrSize.toString()} onValueChange={(val) => setQrSize(parseInt(val))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="200">200 px</SelectItem>
                        <SelectItem value="500">500 px</SelectItem>
                        <SelectItem value="1000" disabled={!isHighResAllowed}>1000 px {!isHighResAllowed && "(Locked)"}</SelectItem>
                        <SelectItem value="2000" disabled={!isHighResAllowed}>2000 px {!isHighResAllowed && "(Locked)"}</SelectItem>
                        <SelectItem value="3000" disabled={!isHighResAllowed}>3000 px {!isHighResAllowed && "(Locked)"}</SelectItem>
                        <SelectItem value="4000" disabled={!isHighResAllowed}>4000 px {!isHighResAllowed && "(Locked)"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Margin</Label>
                    <Select value={qrMargin.toString()} onValueChange={(val) => setQrMargin(parseInt(val))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">None (0)</SelectItem>
                        <SelectItem value="1">Small (1)</SelectItem>
                        <SelectItem value="2">Medium (2)</SelectItem>
                        <SelectItem value="4">Large (4)</SelectItem>
                        <SelectItem value="8">Huge (8)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
              {activeTab === "barcode" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Format</Label>
                    <Select value={barcodeFormat} onValueChange={setBarcodeFormat}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CODE128">CODE128 (Standard)</SelectItem>
                        <SelectItem value="EAN13">EAN-13 (Retail)</SelectItem>
                        <SelectItem value="UPC">UPC-A</SelectItem>
                        <SelectItem value="CODE39">CODE39</SelectItem>
                        <SelectItem value="ITF14">ITF-14</SelectItem>
                        <SelectItem value="MSI">MSI</SelectItem>
                        <SelectItem value="pharmacode">Pharmacode</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Note: Some formats like EAN-13 only accept specific numeric lengths.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Bar Width</Label>
                    <Select value={barcodeWidth.toString()} onValueChange={(val) => setBarcodeWidth(parseInt(val))}>
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Thin (1)</SelectItem>
                        <SelectItem value="2">Standard (2)</SelectItem>
                        <SelectItem value="3">Thick (3)</SelectItem>
                        <SelectItem value="4">Extra Thick (4)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Bar Height</Label>
                    <Select value={barcodeHeight.toString()} onValueChange={(val) => setBarcodeHeight(parseInt(val))}>
                      <SelectTrigger className="bg-background rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">Short (50)</SelectItem>
                        <SelectItem value="100">Standard (100)</SelectItem>
                        <SelectItem value="150">Tall (150)</SelectItem>
                        <SelectItem value="200">Extra Tall (200)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </Tabs>
          <div className="pt-4 flex flex-col sm:flex-row justify-center sm:justify-start gap-4">
            {isGenerationPaused && activeTab === "qr" && (
              <Button onClick={generateQRCode} className="gap-2 rounded-2xl h-12 px-8 min-w-[180px] w-full sm:w-auto bg-primary/90 hover:bg-primary">
                <Play className="h-4 w-4" /> Generate QR
              </Button>
            )}
            <Button onClick={downloadCode} className="gap-2 rounded-2xl h-12 px-8 min-w-[180px] w-full sm:w-auto">
              <Download className="h-4 w-4" /> Download PNG
            </Button>
            <Button onClick={copyImage} variant="outline" className="gap-2 rounded-2xl h-12 px-8 min-w-[180px] w-full sm:w-auto">
              {isCopied ? (
                <>
                  <Check className="h-4 w-4 text-green-500" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" /> Copy Image
                </>
              )}
            </Button>
          </div>
        </Card>
        <Card className="p-6 flex flex-col items-center justify-center bg-muted/30 border-dashed min-h-[300px] lg:h-full overflow-hidden rounded-2xl">
          <div className="bg-white p-4 rounded-lg shadow-sm w-full h-[250px] sm:h-[350px] flex items-center justify-center overflow-hidden">
            {activeTab === "qr" ? (
              <canvas
                ref={qrCanvasRef}
                className="max-w-full max-h-full aspect-square object-contain shadow-sm"
              />
            ) : (
              <svg
                ref={barcodeSvgRef}
                className="max-w-full max-h-full object-contain"
              />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-6 text-center">
            Preview of your generated {activeTab === "qr" ? "QR Code" : "Barcode"}.
          </p>
        </Card>
      </div>
    </div>
  )
}