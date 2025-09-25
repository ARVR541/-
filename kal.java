
import javax.swing.*;
import javax.swing.border.EmptyBorder;
import javax.swing.event.DocumentEvent;
import javax.swing.event.DocumentListener;
import java.awt.*;
import java.awt.datatransfer.StringSelection;
import java.awt.datatransfer.Clipboard;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.math.BigDecimal;
import java.math.BigInteger;
import java.math.MathContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

public class kal extends JFrame {
    public static final class Rational implements Comparable<Rational> {
        private final BigInteger num;
        private final BigInteger den;

        public Rational(BigInteger n, BigInteger d) {
            if (d.equals(BigInteger.ZERO)) throw new ArithmeticException("Division by zero");
            BigInteger g = n.gcd(d);
            n = n.divide(g);
            d = d.divide(g);
            if (d.signum() < 0) {
                n = n.negate();
                d = d.negate();
            }
            this.num = n;
            this.den = d;
        }

        public static Rational of(long n) { return new Rational(BigInteger.valueOf(n), BigInteger.ONE); }
        public static Rational parse(String s) {
            s = s.trim();
            if (s.isEmpty() || s.equals("+") || s.equals("-")) return Rational.of(0);
            if (s.contains("e") || s.contains("E")) {
                BigDecimal bd = new BigDecimal(s);
                return fromBigDecimal(bd, 20);
            }
            if (s.contains("/")) {
                String[] parts = s.split("/");
                return new Rational(new BigInteger(parts[0].trim()), new BigInteger(parts[1].trim()));
            }
            if (s.contains(".")) {
                BigDecimal bd = new BigDecimal(s);
                return fromBigDecimal(bd, s.length());
            }
            return new Rational(new BigInteger(s), BigInteger.ONE);
        }
        public static Rational fromBigDecimal(BigDecimal bd, int scaleHint) {
            bd = bd.stripTrailingZeros();
            int scale = Math.max(0, bd.scale());
            BigInteger n = bd.unscaledValue();
            BigInteger d = BigInteger.TEN.pow(scale);
            return new Rational(n, d);
        }
        public Rational add(Rational o) { return new Rational(this.num.multiply(o.den).add(o.num.multiply(this.den)), this.den.multiply(o.den)); }
        public Rational sub(Rational o) { return new Rational(this.num.multiply(o.den).subtract(o.num.multiply(this.den)), this.den.multiply(o.den)); }
        public Rational mul(Rational o) { return new Rational(this.num.multiply(o.num), this.den.multiply(o.den)); }
        public Rational div(Rational o) {
            if (o.num.equals(BigInteger.ZERO)) throw new ArithmeticException("Division by zero");
            return new Rational(this.num.multiply(o.den), this.den.multiply(o.num));
        }
        public Rational neg() { return new Rational(this.num.negate(), this.den); }
        public boolean isZero() { return num.equals(BigInteger.ZERO); }
        public String toString() {
            if (den.equals(BigInteger.ONE)) return num.toString();
            return num.toString() + "/" + den.toString();
        }
        public String toDecimal(int precision) {
            BigDecimal a = new BigDecimal(num);
            BigDecimal b = new BigDecimal(den);
            BigDecimal q = a.divide(b, new MathContext(Math.max(1, precision+2)));
            q = q.setScale(Math.max(0, precision), BigDecimal.ROUND_HALF_UP);
            return q.toPlainString();
        }
        @Override public int compareTo(Rational o) {
            return this.num.multiply(o.den).compareTo(o.num.multiply(this.den));
        }
    }

    // ====== Trace structures ======
    static abstract class Trace { }
    static class Trace2x2 extends Trace {
        Rational a,b,c,d,ad,bc,res;
        public Trace2x2(Rational a, Rational b, Rational c, Rational d, Rational ad, Rational bc, Rational res){
            this.a=a; this.b=b; this.c=c; this.d=d; this.ad=ad; this.bc=bc; this.res=res;
        }
    }
    static class TraceSarrus extends Trace {
        String formula;
        Rational pos1,pos2,pos3,neg1,neg2,neg3,sumPos,sumNeg,result;
        Rational[][] m;
    }
    static class TraceLaplace extends Trace {
        String direction; // "row" or "col"
        int index; // 0-based
        int size;
        List<Term> terms = new ArrayList<>();
        Rational result = Rational.of(0);
    }
    static class Term {
        int i,j; // 1-based in output
        Rational element;
        Rational[][] minor;
        Rational minorDet;
        int sign; // +1 or -1
        Rational cofactor;
        Rational termValue;
        Trace subTrace;
    }

    // ====== UI components ======
    private JComboBox<Integer> sizeBox;
    private JComboBox<String> methodBox;
    private JCheckBox autoSelectBox;
    private JComboBox<String> laplaceDirBox;
    private JSpinner laplaceIndexSpinner;
    private JCheckBox showStepsBox;
    private JSpinner precisionSpinner;

    private JPanel matrixPanel;
    private JTextField[][] fields;
    private JButton randomBtn, clearBtn, examplesBtn, calcBtn, copyBtn;
    private JTextArea stepsArea;
    private JLabel exactLabel, approxLabel;

    private final Random rng = new Random();

    public kal(){
        super("Детерминант матрицы — Java (Swing)");
        setDefaultCloseOperation(EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(900, 600));
        setLocationRelativeTo(null);

        // Root
        JPanel root = new JPanel(new BorderLayout());
        root.setBackground(new Color(15,18,32));
        setContentPane(root);

        // Header
        JPanel header = new JPanel(new BorderLayout());
        header.setBackground(gradient(new Color(106,167,255), new Color(145,90,255)));
        header.setBorder(new EmptyBorder(16,16,16,16));
        JLabel h1 = new JLabel("Вычисление детерминанта матрицы");
        h1.setForeground(Color.WHITE);
        h1.setFont(h1.getFont().deriveFont(Font.BOLD, 20f));
        JLabel h2 = new JLabel("Точные вычисления (Rational) + пошаговый вывод");
        h2.setForeground(new Color(240,240,255));
        header.add(h1, BorderLayout.NORTH);
        header.add(h2, BorderLayout.SOUTH);
        root.add(header, BorderLayout.NORTH);

        // Content
        JPanel content = new JPanel();
        content.setBackground(new Color(0,0,0,0));
        content.setLayout(new BoxLayout(content, BoxLayout.Y_AXIS));
        content.setBorder(new EmptyBorder(16,16,16,16));
        root.add(new JScrollPane(content), BorderLayout.CENTER);

        // Settings row
        JPanel settings = cardPanel();
        settings.setLayout(new GridLayout(1, 0, 12, 12));
        settings.add(buildSizeCard());
        settings.add(buildMethodCard());
        settings.add(buildLaplaceCard());
        settings.add(buildOutputCard());
        content.add(settings);

        // Matrix input
        JPanel matrixCard = cardPanel();
        matrixCard.setLayout(new BorderLayout(8,8));
        JLabel mxTitle = new JLabel("Ввод матрицы");
        mxTitle.setForeground(new Color(199,203,227));
        matrixCard.add(mxTitle, BorderLayout.NORTH);
        matrixPanel = new JPanel();
        matrixPanel.setOpaque(false);
        matrixCard.add(new JScrollPane(matrixPanel), BorderLayout.CENTER);
        JLabel pasteHint = new JLabel("Подсказка: можно вставлять из Excel/таблиц, разделители — пробел, таб, запятая, точка с запятой.");
        pasteHint.setForeground(new Color(185, 225, 255));
        matrixCard.add(pasteHint, BorderLayout.SOUTH);
        content.add(Box.createVerticalStrut(10));
        content.add(matrixCard);

        // Buttons
        JPanel buttons = new JPanel(new FlowLayout(FlowLayout.LEFT, 10, 0));
        buttons.setOpaque(false);
        randomBtn = primaryButton("Случайная матрица");
        clearBtn = altButton("Очистить");
        examplesBtn = altButton("Примеры");
        calcBtn = primaryButton("Посчитать");
        copyBtn = altButton("Копировать решение");
        copyBtn.setEnabled(false);
        buttons.add(randomBtn);
        buttons.add(clearBtn);
        buttons.add(examplesBtn);
        buttons.add(calcBtn);
        buttons.add(copyBtn);
        content.add(Box.createVerticalStrut(10));
        content.add(buttons);

        // Solution
        JPanel solution = cardPanel();
        solution.setLayout(new BorderLayout(8,8));
        JLabel solTitle = new JLabel("Решение");
        solTitle.setForeground(new Color(0,200,150));
        solution.add(solTitle, BorderLayout.NORTH);

        stepsArea = new JTextArea(12, 60);
        stepsArea.setEditable(false);
        stepsArea.setLineWrap(true);
        stepsArea.setWrapStyleWord(true);
        stepsArea.setFont(new Font(Font.MONOSPACED, Font.PLAIN, 13));
        solution.add(new JScrollPane(stepsArea), BorderLayout.CENTER);

        JPanel answerPanel = new JPanel();
        answerPanel.setOpaque(true);
        answerPanel.setBackground(gradGreen());
        answerPanel.setBorder(new EmptyBorder(12,12,12,12));
        answerPanel.setLayout(new GridLayout(0,1));
        exactLabel = new JLabel("Точно: —");
        exactLabel.setForeground(Color.WHITE);
        exactLabel.setFont(exactLabel.getFont().deriveFont(Font.BOLD));
        approxLabel = new JLabel("Приблизительно: —");
        approxLabel.setForeground(Color.WHITE);
        solution.add(answerPanel, BorderLayout.SOUTH);
        answerPanel.add(exactLabel);
        answerPanel.add(approxLabel);

        content.add(Box.createVerticalStrut(10));
        content.add(solution);

        // Init grid
        rebuildMatrix(3);

        // Listeners
        randomBtn.addActionListener(e -> fillRandom());
        clearBtn.addActionListener(e -> clearMatrix());
        examplesBtn.addActionListener(e -> loadExample());
        calcBtn.addActionListener(e -> calculate());
        copyBtn.addActionListener(e -> copySteps());

        pack();
    }

    private JPanel buildSizeCard(){
        JPanel p = cardPanel();
        p.setLayout(new GridLayout(0,1,6,6));
        p.add(label("Размерность"));
        Integer[] sizes = new Integer[7];
        for (int i=0;i<7;i++) sizes[i]=i+2; // 2..8
        sizeBox = new JComboBox<>(sizes);
        sizeBox.setSelectedItem(3);
        sizeBox.addActionListener(e -> {
            int n = (Integer) sizeBox.getSelectedItem();
            rebuildMatrix(n);
            updateUIState();
        });
        p.add(sizeBox);
        return p;
    }

    private JPanel buildMethodCard(){
        JPanel p = cardPanel();
        p.setLayout(new GridLayout(0,1,6,6));
        p.add(label("Метод"));
        methodBox = new JComboBox<>(new String[]{"Саррюс (3×3)","Разложение Лапласа"});
        methodBox.addActionListener(e -> updateUIState());
        p.add(methodBox);
        autoSelectBox = new JCheckBox("Автовыбор строки/столбца с нулями");
        autoSelectBox.setOpaque(false);
        autoSelectBox.setForeground(new Color(199,203,227));
        autoSelectBox.setSelected(true);
        autoSelectBox.addActionListener(e -> updateUIState());
        p.add(autoSelectBox);
        return p;
    }

    private JPanel buildLaplaceCard(){
        JPanel p = cardPanel();
        p.setLayout(new GridLayout(0,1,6,6));
        p.add(label("Параметры Laplace"));
        laplaceDirBox = new JComboBox<>(new String[]{"По строке","По столбцу"});
        p.add(laplaceDirBox);
        laplaceIndexSpinner = new JSpinner(new SpinnerNumberModel(1,1,8,1));
        p.add(labeled("Индекс (1-based)", laplaceIndexSpinner));
        return p;
    }

    private JPanel buildOutputCard(){
        JPanel p = cardPanel();
        p.setLayout(new GridLayout(0,1,6,6));
        p.add(label("Вывод"));
        showStepsBox = new JCheckBox("Показывать шаги");
        showStepsBox.setSelected(true);
        showStepsBox.setOpaque(false);
        showStepsBox.setForeground(new Color(199,203,227));
        p.add(showStepsBox);
        precisionSpinner = new JSpinner(new SpinnerNumberModel(6,0,12,1));
        p.add(labeled("Точность десятичного вывода", precisionSpinner));
        return p;
    }

    private void updateUIState(){
        int n = (Integer) sizeBox.getSelectedItem();
        boolean sarrusAllowed = n==3;
        if (!sarrusAllowed && methodBox.getSelectedIndex()==0){
            methodBox.setSelectedIndex(1);
        }
        methodBox.setEnabled(true);
        // Laplace params disabled when Sarrus OR autoSelect
        boolean disableLaplaceParams = (methodBox.getSelectedIndex()==0) || autoSelectBox.isSelected();
        laplaceDirBox.setEnabled(!disableLaplaceParams);
        laplaceIndexSpinner.setEnabled(!disableLaplaceParams);
        ((SpinnerNumberModel)laplaceIndexSpinner.getModel()).setMaximum(n);
        if ((int)((SpinnerNumberModel)laplaceIndexSpinner.getModel()).getNumber() > n){
            laplaceIndexSpinner.setValue(n);
        }
    }

    private JPanel cardPanel(){
        JPanel p = new JPanel();
        p.setOpaque(true);
        p.setBackground(new Color(255,255,255,25));
        p.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(255,255,255,40),1,true),
                new EmptyBorder(12,12,12,12)
        ));
        return p;
    }
    private JLabel label(String s){
        JLabel l = new JLabel(s);
        l.setForeground(new Color(199,203,227));
        return l;
    }
    private JPanel labeled(String title, JComponent comp){
        JPanel p = new JPanel(new BorderLayout());
        p.setOpaque(false);
        JLabel l = label(title);
        p.add(l, BorderLayout.NORTH);
        p.add(comp, BorderLayout.CENTER);
        return p;
    }
    private JButton primaryButton(String text){
        JButton b = new JButton(text);
        b.setForeground(Color.WHITE);
        b.setBackground(new Color(60,120,255));
        b.setBorder(BorderFactory.createEmptyBorder(10,14,10,14));
        return b;
    }
    private JButton altButton(String text){
        JButton b = new JButton(text);
        b.setForeground(new Color(230,235,255));
        b.setBackground(new Color(255,255,255,35));
        b.setBorder(BorderFactory.createEmptyBorder(10,14,10,14));
        return b;
    }
    private Color gradient(Color a, Color b){
        // simple return of a for header background; Swing doesn't have gradient without painting; kept simple
        return a;
    }
    private Color gradGreen(){ return new Color(0,168,122); }

    // ====== Matrix handling ======
    private void rebuildMatrix(int n){
        matrixPanel.removeAll();
        matrixPanel.setLayout(new GridLayout(n, n, 6, 6));
        fields = new JTextField[n][n];
        for (int i=0;i<n;i++){
            for (int j=0;j<n;j++){
                JTextField tf = new JTextField("0");
                tf.setHorizontalAlignment(SwingConstants.CENTER);
                fields[i][j] = tf;
                matrixPanel.add(tf);
            }
        }
        matrixPanel.revalidate();
        matrixPanel.repaint();
    }

    private Rational[][] readMatrix(){
        int n = fields.length;
        Rational[][] m = new Rational[n][n];
        for (int i=0;i<n;i++){
            for (int j=0;j<n;j++){
                String txt = fields[i][j].getText().trim();
                if (txt.isEmpty()) txt = "0";
                m[i][j] = Rational.parse(txt);
            }
        }
        return m;
    }

    private void fillRandom(){
        int n = fields.length;
        for (int i=0;i<n;i++){
            for (int j=0;j<n;j++){
                double v = (rng.nextDouble()-0.5)*10;
                String s = String.format(java.util.Locale.US, "%.2f", v);
                fields[i][j].setText(s);
            }
        }
    }
    private void clearMatrix(){
        int n = fields.length;
        for (int i=0;i<n;i++) for (int j=0;j<n;j++) fields[i][j].setText("0");
    }
    private void loadExample(){
        int n = fields.length;
        if (n==3){
            String[][] ex = {{"1","2","3"},{"0","1","4"},{"5","6","0"}};
            for (int i=0;i<n;i++) for (int j=0;j<n;j++) fields[i][j].setText(ex[i][j]);
            methodBox.setSelectedIndex(0);
        } else if (n==4){
            String[][] ex = {{"1","0","2","0"},{"0","3","0","0"},{"4","0","5","0"},{"0","0","0","6"}};
            for (int i=0;i<n;i++) for (int j=0;j<n;j++) fields[i][j].setText(ex[i][j]);
            methodBox.setSelectedIndex(1);
            laplaceDirBox.setSelectedIndex(0);
            laplaceIndexSpinner.setValue(1);
            autoSelectBox.setSelected(true);
        } else if (n==2){
            String[][] ex = {{"0.5","0"},{"0","0.2"}};
            for (int i=0;i<n;i++) for (int j=0;j<n;j++) fields[i][j].setText(ex[i][j]);
            methodBox.setSelectedIndex(1);
        }
        updateUIState();
    }

    private void copySteps(){
        String text = stepsArea.getText();
        if (text==null || text.isEmpty()) return;
        Clipboard cb = Toolkit.getDefaultToolkit().getSystemClipboard();
        cb.setContents(new StringSelection(text), null);
        JOptionPane.showMessageDialog(this, "Решение скопировано в буфер обмена.");
    }

    // ====== Determinant logic ======
    private Object[] det2x2(Rational[][] m){
        Rational a=m[0][0], b=m[0][1], c=m[1][0], d=m[1][1];
        Rational ad=a.mul(d), bc=b.mul(c);
        Rational res = ad.sub(bc);
        return new Object[]{res, new Trace2x2(a,b,c,d,ad,bc,res)};
    }

    private Object[] sarrus3x3(Rational[][] m){
        Rational pos1 = m[0][0].mul(m[1][1]).mul(m[2][2]);
        Rational pos2 = m[0][1].mul(m[1][2]).mul(m[2][0]);
        Rational pos3 = m[0][2].mul(m[1][0]).mul(m[2][1]);
        Rational neg1 = m[0][2].mul(m[1][1]).mul(m[2][0]);
        Rational neg2 = m[0][0].mul(m[1][2]).mul(m[2][1]);
        Rational neg3 = m[0][1].mul(m[1][0]).mul(m[2][2]);
        Rational sumPos = pos1.add(pos2).add(pos3);
        Rational sumNeg = neg1.add(neg2).add(neg3);
        Rational res = sumPos.sub(sumNeg);
        TraceSarrus t = new TraceSarrus();
        t.formula = "det(A) = a11·a22·a33 + a12·a23·a31 + a13·a21·a32 − (a13·a22·a31 + a11·a23·a32 + a12·a21·a33)";
        t.pos1=pos1; t.pos2=pos2; t.pos3=pos3; t.neg1=neg1; t.neg2=neg2; t.neg3=neg3; t.sumPos=sumPos; t.sumNeg=sumNeg; t.result=res; t.m=m;
        return new Object[]{res, t};
    }

    private Rational[][] minor(Rational[][] m, int r, int c){
        int n = m.length;
        Rational[][] mi = new Rational[n-1][n-1];
        int rr=0;
        for (int i=0;i<n;i++){
            if (i==r) continue;
            int cc=0;
            for (int j=0;j<n;j++){
                if (j==c) continue;
                mi[rr][cc++] = m[i][j];
            }
            rr++;
        }
        return mi;
    }

    private int findBestIndex(Rational[][] m, String direction){
        int n = m.length;
        int best = 0;
        int maxZeros = -1;
        for (int i=0;i<n;i++){
            int zeros=0;
            for (int j=0;j<n;j++){
                Rational el = direction.equals("row") ? m[i][j] : m[j][i];
                if (el.isZero()) zeros++;
            }
            if (zeros>maxZeros){
                maxZeros=zeros;
                best=i;
            }
        }
        return best;
    }

    private Object[] laplace(Rational[][] m, String direction, int index, boolean traceEnabled){
        int n = m.length;
        if (n==2) return det2x2(m);
        if (n==3) return sarrus3x3(m);

        TraceLaplace t = new TraceLaplace();
        t.direction = direction;
        t.index = index;
        t.size = n;

        Rational result = Rational.of(0);
        for (int k=0;k<n;k++){
            int i = direction.equals("row") ? index : k;
            int j = direction.equals("col") ? index : k;
            Rational a = m[i][j];
            if (!a.isZero()){
                Rational[][] mi = minor(m, i, j);
                Object[] sub = laplace(mi, "row", 0, traceEnabled);
                Rational minorDet = (Rational) sub[0];
                int sign = ((i+j)%2==0) ? +1 : -1;
                Rational cofactor = a.mul(minorDet);
                Rational term = (sign==1) ? cofactor : cofactor.neg();
                result = result.add(term);
                if (traceEnabled){
                    Term termObj = new Term();
                    termObj.i = i+1; termObj.j=j+1; termObj.element=a; termObj.minor=mi;
                    termObj.minorDet = minorDet; termObj.sign = sign; termObj.cofactor = cofactor;
                    termObj.termValue = term; termObj.subTrace = (Trace) sub[1];
                    t.terms.add(termObj);
                }
            }
        }
        t.result = result;
        return new Object[]{result, t};
    }

    private void calculate(){
        try{
            Rational[][] m = readMatrix();
            int n = m.length;
            if (n>8){ JOptionPane.showMessageDialog(this, "Размер матрицы не может быть больше 8"); return; }

            boolean showSteps = showStepsBox.isSelected();
            int precision = (Integer) precisionSpinner.getValue();

            Rational result;
            Trace trace;

            if (methodBox.getSelectedIndex()==0 && n==3){
                Object[] r = sarrus3x3(m);
                result = (Rational) r[0];
                trace = (Trace) r[1];
            } else {
                String dir = (laplaceDirBox.getSelectedIndex()==0) ? "row" : "col";
                int idx = ((Integer) laplaceIndexSpinner.getValue()) - 1;
                if (autoSelectBox.isSelected()){
                    idx = findBestIndex(m, dir);
                }
                Object[] r = laplace(m, dir, idx, showSteps);
                result = (Rational) r[0];
                trace = (Trace) r[1];
            }

            // Render
            StringBuilder sb = new StringBuilder();
            sb.append("Исходная матрица:\n");
            sb.append(matrixToString(m)).append("\n\n");
            if (showSteps){
                renderTrace(trace, sb, 0);
            }
            stepsArea.setText(sb.toString());
            exactLabel.setText("Точно: " + result.toString());
            approxLabel.setText("Приблизительно: " + result.toDecimal(precision));
            copyBtn.setEnabled(true);

        } catch (Exception ex){
            JOptionPane.showMessageDialog(this, "Ошибка: " + ex.getMessage());
        }
    }

    private void renderTrace(Trace tr, StringBuilder sb, int depth){
        String ind = "  ".repeat(depth);
        if (tr instanceof Trace2x2 t){
            sb.append(ind).append("Детерминант 2×2: ad - bc\n");
            sb.append(ind).append("a=").append(t.a).append(", b=").append(t.b).append(", c=").append(t.c).append(", d=").append(t.d).append("\n");
            sb.append(ind).append("ad=").append(t.ad).append(", bc=").append(t.bc).append("\n");
            sb.append(ind).append("det=").append(t.res).append("\n\n");
        } else if (tr instanceof TraceSarrus t){
            sb.append(ind).append("Метод Саррюса (3×3)\n");
            sb.append(ind).append(t.formula).append("\n");
            sb.append(ind).append("Положительные: ").append(t.pos1).append(", ").append(t.pos2).append(", ").append(t.pos3).append("\n");
            sb.append(ind).append("Отрицательные: ").append(t.neg1).append(", ").append(t.neg2).append(", ").append(t.neg3).append("\n");
            sb.append(ind).append("S+ = ").append(t.sumPos).append(", S- = ").append(t.sumNeg).append("\n");
            sb.append(ind).append("det = ").append(t.result).append("\n\n");
        } else if (tr instanceof TraceLaplace t){
            sb.append(ind).append("Разложение по ").append(t.direction.equals("row") ? "строке " : "столбцу ").append(t.index+1).append("\n");
            int i=1;
            for (Term term : t.terms){
                sb.append(ind).append("  Слагаемое ").append(i++).append(": a_").append(term.i).append(",").append(term.j).append(" = ").append(term.element).append("\n");
                sb.append(ind).append("    Знак: ").append(term.sign>0?"+":"-").append(", Минор det = ").append(term.minorDet).append(", Кофактор = ").append(term.cofactor).append(", Вклад = ").append(term.termValue).append("\n");
                renderTrace(term.subTrace, sb, depth+2);
            }
            sb.append(ind).append("Итого: ").append(t.result).append("\n\n");
        }
    }

    private String matrixToString(Rational[][] m){
        StringBuilder sb = new StringBuilder();
        for (int i=0;i<m.length;i++){
            sb.append("| ");
            for (int j=0;j<m.length;j++){
                sb.append(String.format("%-10s", m[i][j].toString()));
            }
            sb.append("|\n");
        }
        return sb.toString();
    }

    public static void main(String[] args){
        SwingUtilities.invokeLater(() -> {
            try {
                UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName());
            } catch (Exception ignored) {}
            new kal().setVisible(true);
        });
    }
}
