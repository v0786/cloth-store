import ExcelImportUploader from "@/components/admin/ExcelImportUploader";

export default function AdminImportPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Excel Import</h1>
      <p className="mt-2 text-sm text-neutral-600">
        Upload .xlsx/.xls with mandatory columns: sr.no/product code, product name, product image filename, price.
      </p>
      <div className="mt-6">
        <ExcelImportUploader />
      </div>
    </div>
  );
}

