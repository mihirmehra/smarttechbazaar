import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Settings from "@/models/Settings";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Helper function to convert number to words (Indian format)
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = numToWords(rupees);
  if (paise > 0) {
    result += " and " + numToWords(paise) + " Paise";
  }
  return result || "Zero";
}

// Generate PDF Invoice
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = await Order.findById(id)
      .populate("user", "name email phone gstNumber businessName")
      .lean() as any;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order or is admin
    const isAdmin = session.user.role === "admin" || session.user.role === "super_admin";
    const isOwner = order.user?._id?.toString() === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get store settings
    const settings = await Settings.findOne().lean() as {
      storeName?: string;
      storeEmail?: string;
      storePhone?: string;
      storeAddress?: string;
      businessGstin?: string;
    } | null;

    // Create PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Company colors
    const primaryColor: [number, number, number] = [220, 38, 38]; // Red
    const darkColor: [number, number, number] = [26, 26, 26];
    const grayColor: [number, number, number] = [107, 114, 128];

    // Header
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(settings?.storeName || "Sabka Tech Bazar", 15, 18);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Your Trusted Tech Partner", 15, 26);

    // TAX INVOICE label
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("TAX INVOICE", pageWidth - 15, 18, { align: "right" });
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`INV-${order.orderNumber}`, pageWidth - 15, 26, { align: "right" });

    // Invoice details box
    doc.setTextColor(...darkColor);
    doc.setFontSize(9);
    const invoiceDate = new Date(order.createdAt).toLocaleDateString("en-IN", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });
    
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, 42, pageWidth - 30, 18, 2, 2, "FD");
    
    doc.setFont("helvetica", "normal");
    doc.text(`Invoice Date: ${invoiceDate}`, 20, 52);
    doc.text(`Order #: ${order.orderNumber}`, 80, 52);
    doc.text(`Payment: ${order.paymentMethod.replace("_", " ").toUpperCase()}`, 140, 52);
    doc.text(`Status: ${order.paymentStatus.toUpperCase()}`, pageWidth - 50, 52);

    // Seller and Buyer info
    const yStart = 68;
    
    // Seller box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(15, yStart, 85, 45, 2, 2, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("SOLD BY", 20, yStart + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    doc.text(settings?.storeName || "Sabka Tech Bazar", 20, yStart + 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const sellerAddress = settings?.storeAddress || "2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore - 560002";
    const sellerLines = doc.splitTextToSize(sellerAddress, 75);
    doc.text(sellerLines, 20, yStart + 22);
    
    doc.text(`Phone: ${settings?.storePhone || "+91 6363677588"}`, 20, yStart + 35);
    doc.text(`GSTIN: ${settings?.businessGstin || "29AABCU9603R1ZM"}`, 20, yStart + 41);

    // Buyer box
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(105, yStart, 90, 45, 2, 2, "F");
    
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("BILL TO / SHIP TO", 110, yStart + 8);
    
    doc.setFontSize(10);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "bold");
    const buyerName = order.user?.businessName || order.shippingAddress?.name || order.user?.name || "Customer";
    doc.text(buyerName, 110, yStart + 15);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    if (order.shippingAddress) {
      const buyerAddress = `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`;
      const buyerLines = doc.splitTextToSize(buyerAddress, 80);
      doc.text(buyerLines, 110, yStart + 22);
      doc.text(`Phone: ${order.shippingAddress.phone}`, 110, yStart + 35);
    }
    
    if (order.taxBreakdown?.customerGstin || order.user?.gstNumber) {
      doc.text(`GSTIN: ${order.taxBreakdown?.customerGstin || order.user?.gstNumber}`, 110, yStart + 41);
    }

    // Items table
    const tableStartY = yStart + 52;
    
    const tableData = order.items.map((item: { name: string; sku: string; price: number; quantity: number; total: number }, index: number) => [
      (index + 1).toString(),
      item.name,
      item.sku,
      `Rs. ${item.price.toLocaleString("en-IN")}`,
      item.quantity.toString(),
      `Rs. ${item.total.toLocaleString("en-IN")}`
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [["#", "Description", "SKU", "Price", "Qty", "Amount"]],
      body: tableData,
      theme: "striped",
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        textColor: darkColor,
      },
      alternateRowStyles: {
        fillColor: [248, 249, 250],
      },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 60 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25, halign: "right" },
        4: { cellWidth: 15, halign: "center" },
        5: { cellWidth: 30, halign: "right" },
      },
      margin: { left: 15, right: 15 },
    });

    // Get the final Y position after table
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;

    // Totals section
    const totalsX = pageWidth - 90;
    let currentY = finalY;
    
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(totalsX - 5, finalY - 5, 80, 55, 2, 2, "F");

    doc.setFontSize(9);
    doc.setTextColor(...grayColor);
    doc.text("Subtotal:", totalsX, currentY);
    doc.setTextColor(...darkColor);
    doc.text(`Rs. ${order.subtotal.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
    currentY += 7;

    doc.setTextColor(...grayColor);
    doc.text("Shipping:", totalsX, currentY);
    doc.setTextColor(...darkColor);
    doc.text(order.shippingCost === 0 ? "Free" : `Rs. ${order.shippingCost.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
    currentY += 7;

    if (order.discount > 0) {
      doc.setTextColor(16, 185, 129);
      doc.text("Discount:", totalsX, currentY);
      doc.text(`-Rs. ${order.discount.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 7;
    }

    // Tax breakdown
    if (order.taxBreakdown) {
      if (order.taxBreakdown.taxType === "INTRA") {
        doc.setTextColor(...grayColor);
        doc.text("CGST (9%):", totalsX, currentY);
        doc.setTextColor(...darkColor);
        doc.text(`Rs. ${order.taxBreakdown.cgst.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 7;
        
        doc.setTextColor(...grayColor);
        doc.text("SGST (9%):", totalsX, currentY);
        doc.setTextColor(...darkColor);
        doc.text(`Rs. ${order.taxBreakdown.sgst.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 7;
      } else {
        doc.setTextColor(...grayColor);
        doc.text("IGST (18%):", totalsX, currentY);
        doc.setTextColor(...darkColor);
        doc.text(`Rs. ${order.taxBreakdown.igst.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
        currentY += 7;
      }
    } else if (order.tax > 0) {
      doc.setTextColor(...grayColor);
      doc.text("Tax:", totalsX, currentY);
      doc.setTextColor(...darkColor);
      doc.text(`Rs. ${order.tax.toLocaleString("en-IN")}`, pageWidth - 15, currentY, { align: "right" });
      currentY += 7;
    }

    // Total
    currentY += 3;
    doc.setDrawColor(26, 26, 26);
    doc.line(totalsX - 5, currentY - 3, pageWidth - 15, currentY - 3);
    
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primaryColor);
    doc.text("TOTAL:", totalsX, currentY + 4);
    doc.text(`Rs. ${order.total.toLocaleString("en-IN")}`, pageWidth - 15, currentY + 4, { align: "right" });

    // Amount in words
    const amountWordsY = currentY + 20;
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...grayColor);
    doc.text("Amount in Words:", 15, amountWordsY);
    doc.setTextColor(...darkColor);
    doc.setFont("helvetica", "italic");
    doc.text(`Indian Rupees ${numberToWords(order.total)} Only`, 15, amountWordsY + 6);

    // Terms & Conditions
    const termsY = amountWordsY + 18;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...grayColor);
    doc.text("Terms & Conditions:", 15, termsY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("1. Goods once sold will not be taken back.", 15, termsY + 6);
    doc.text("2. Subject to Bangalore jurisdiction only.", 15, termsY + 11);
    doc.text("3. E&OE - Errors and Omissions Excepted.", 15, termsY + 16);

    // Signature
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Authorized Signatory", pageWidth - 50, termsY + 12);
    doc.line(pageWidth - 70, termsY + 5, pageWidth - 20, termsY + 5);

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(220, 220, 220);
    doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);
    
    doc.setFontSize(7);
    doc.setTextColor(...grayColor);
    doc.text("This is a computer-generated invoice and does not require a physical signature.", pageWidth / 2, footerY, { align: "center" });
    doc.text(`Generated on ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, pageWidth / 2, footerY + 5, { align: "center" });

    // Output PDF as buffer
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Invoice-${order.orderNumber}.pdf"`,
        "Content-Length": pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error("Error generating PDF invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF invoice" },
      { status: 500 }
    );
  }
}
