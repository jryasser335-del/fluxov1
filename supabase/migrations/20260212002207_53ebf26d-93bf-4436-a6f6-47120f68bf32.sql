ALTER TABLE public.partidos_en_vivo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view partidos_en_vivo" ON public.partidos_en_vivo FOR SELECT USING (true);